import { randomUUID } from "node:crypto";
import {
  CourseBoundEvaluationExclusionCategory,
  CourseScope,
  DeploymentStatus,
  EvaluationTemplateType,
  Prisma,
} from "@prisma/client";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import {
  revalidateProgramHeadAssignment,
  resolveProgramHeadContext,
} from "@/features/auth/services/resolve-program-head-context";
import {
  getFacultyTemplatePublicationContext,
  type FacultyTemplatePublicationContext,
} from "@/features/instruments/services/manage-faculty-templates";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { type ServiceResult } from "@/lib/utils/service-result";
import { type TemplateStructure } from "@/features/instruments/types";
import { canDeployCourseBoundEvaluation } from "../policies";
import { isNeutralOtherExplanation } from "../exclusion-text";
import {
  classifyCourseAlignment,
  type CourseAlignmentState,
} from "@/features/outcomes/services/classify-course-alignment";
import type {
  PublishCourseBoundEvaluationInput,
  PublishCourseBoundEvaluationResult,
} from "../types";

class PublicationValidationError extends Error {
  constructor(
    message: string,
    readonly alignmentCourseId?: string
  ) {
    super(message);
  }
}

type PublicationContextDb = Prisma.TransactionClient | typeof prisma;

function isTransactionWriteConflict(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2034";
}

function buildPublicationStatus(activationAt: Date | null | undefined): "ACTIVE" | "SCHEDULED" {
  if (activationAt && activationAt.getTime() > Date.now()) {
    return DeploymentStatus.SCHEDULED;
  }

  return DeploymentStatus.ACTIVE;
}

/**
 * New-publication alignment gate: every active CILO of the locked Course must
 * reach at least one valid active target of the Course scope's typed layer.
 * Archived targets and wrong-layer relations never satisfy the gate.
 */
async function classifyPublicationAlignment(
  db: PublicationContextDb,
  courseId: string,
  courseScope: CourseScope,
  owningProgramId: string | null
): Promise<CourseAlignmentState> {
  const cilos = await db.cILO.findMany({
    where: { course_id: courseId, is_active: true },
    select: {
      id: true,
      cilo_mappings: {
        select: { go: { select: { program_id: true, is_active: true } } },
      },
      cilo_institutional_outcome_mappings: {
        select: { institutional_outcome: { select: { is_active: true } } },
      },
    },
  });
  return classifyCourseAlignment(cilos, courseScope, owningProgramId);
}

/**
 * Bypasses the faculty session checks in getFacultyTemplatePublicationContext for on-behalf deployments.
 */
export async function getOnBehalfTemplatePublicationContext(
  templateId: string,
  facultyId: string,
  db: PublicationContextDb = prisma
): Promise<ServiceResult<FacultyTemplatePublicationContext>> {
  const template = await db.instrumentTemplate.findFirst({
    where: {
      id: templateId,
      is_active: true,
      template_type: EvaluationTemplateType.COURSE_BOUND,
      faculty_owner_id: facultyId,
    },
    include: {
      bound_course: {
        include: {
          major: true,
        },
      },
      template_cilo_question_bindings: true,
    },
  });

  if (!template) {
    return { success: false, error: "Course-bound template not found." };
  }

  if (!template.bound_course_id || !template.bound_course) {
    return { success: false, error: "This template is not bound to a course." };
  }

  const cilos = await db.cILO.findMany({
    where: { course_id: template.bound_course_id, is_active: true },
    orderBy: { created_at: "asc" },
    select: { description: true, id: true },
  });

  if (cilos.length === 0) {
    return { success: false, error: "This course has no saved CILOs." };
  }

  const structure = Array.isArray(template.structure)
    ? (template.structure as unknown as TemplateStructure)
    : [];
  const likertQuestions: { sectionKey: string; itemKey: string; prompt: string }[] = [];
  for (const section of structure) {
    if (
      section &&
      typeof section === "object" &&
      "questions" in section &&
      Array.isArray(section.questions)
    ) {
      for (const question of section.questions) {
        if (question && typeof question === "object") {
          const q = question as unknown as Record<string, unknown>;
          if (q.question_type === "LIKERT" || q.type === "LIKERT") {
            likertQuestions.push({
              sectionKey: String((section as unknown as Record<string, unknown>).key),
              itemKey: String(q.key),
              prompt: String(q.prompt),
            });
          }
        }
      }
    }
  }

  const questionMap = new Map(likertQuestions.map((q) => [`${q.sectionKey}:${q.itemKey}`, q]));
  const ciloMap = new Map(cilos.map((c) => [c.id, c]));
  const liveCiloIds = new Set(cilos.map((cilo) => cilo.id));

  const validatedBindings = [];
  const usedCiloIds = new Set<string>();
  const usedQuestionKeys = new Set<string>();

  for (const binding of template.template_cilo_question_bindings) {
    if (!binding.cilo_id) continue;
    const cilo = ciloMap.get(binding.cilo_id);
    const questionKey = `${binding.section_key}:${binding.item_key}`;
    const question = questionMap.get(questionKey);

    if (!cilo) {
      return { success: false, error: "One or more selected CILOs are invalid." };
    }

    if (!question) {
      return { success: false, error: "CILOs can only be assigned to Likert questions." };
    }

    if (usedCiloIds.has(cilo.id)) {
      return { success: false, error: "Each CILO can only be assigned once." };
    }

    if (usedQuestionKeys.has(questionKey)) {
      return { success: false, error: "Each Likert question can only have one CILO." };
    }

    usedCiloIds.add(cilo.id);
    usedQuestionKeys.add(questionKey);

    validatedBindings.push({
      ciloDescriptionSnapshot: cilo.description,
      ciloId: cilo.id,
      itemKey: binding.item_key,
      questionPromptSnapshot: question.prompt,
      sectionKey: binding.section_key,
    });
  }

  const boundCiloIds = new Set(validatedBindings.map((binding) => binding.ciloId));

  if (
    template.template_cilo_question_bindings.length !== cilos.length ||
    cilos.some((cilo) => !boundCiloIds.has(cilo.id) || !liveCiloIds.has(cilo.id))
  ) {
    return {
      success: false,
      error: "Every saved CILO must be assigned to one Likert question before publishing.",
    };
  }

  return {
    success: true,
    data: {
      bindings: validatedBindings,
      cilos,
      course: {
        code: template.bound_course.code,
        courseType: template.bound_course.course_scope,
        id: template.bound_course.id,
        majorId: template.bound_course.major_id,
        majorName: template.bound_course.major?.name ?? null,
        programCode: template.bound_course.program_id ?? "",
        programId: template.bound_course.program_id ?? "",
        programName: "",
        scopeLabel: "",
        title: template.bound_course.title,
      },
      majorId: template.bound_course.major_id,
      programId: template.bound_course.program_id ?? "",
      template: {
        id: template.id,
        name: template.name,
        structure,
      },
    },
  };
}

/**
 * Phase 9: Publish course-bound evaluation using course assignment ID.
 * Resolves class identity from assignment and creates deployment with term/course FKs.
 * Issue #43: Supports on-behalf deployment by PH/Dean/Secretary with policy-based authorization.
 */
export async function publishCourseBoundEvaluation({
  assignmentId,
  activationAt = null,
  deadlineAt = null,
  deploymentName,
  exclusions = [],
  programId,
  templateId,
}: PublishCourseBoundEvaluationInput): Promise<PublishCourseBoundEvaluationResult> {
  let actorId: string | undefined;

  try {
    const authSession = await resolveAuthSession();

    if (!authSession) {
      return { error: "Authentication required.", success: false };
    }
    actorId = authSession.userId;

    const selectedProgram =
      authSession.activeRole === ROLES.PROGRAM_HEAD
        ? programId
          ? await resolveProgramHeadContext(programId)
          : null
        : null;

    if (
      authSession.activeRole === ROLES.PROGRAM_HEAD &&
      (!selectedProgram || !selectedProgram.success)
    ) {
      return { error: "Course assignment not found.", success: false };
    }

    if (!deploymentName.trim()) {
      return { error: "Deployment name is required.", success: false };
    }

    const status = buildPublicationStatus(activationAt);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const result = await prisma.$transaction(
          async (tx) => {
            await tx.$queryRaw`
        SELECT id
        FROM "course_assignments"
        WHERE id = ${assignmentId}::uuid
        FOR UPDATE
      `;

            const lockedAssignment = await tx.courseAssignment.findUnique({
              where: { id: assignmentId },
              include: {
                course: { include: { major: true } },
                program: true,
                term_instance: true,
                course_bound_evaluations: { select: { published_at: true } },
                curriculumCourse: { select: { id: true, curriculum_version_id: true } },
              },
            });

            if (!lockedAssignment) {
              throw new PublicationValidationError("Course assignment not found.");
            }

            const selectedProgramId = selectedProgram?.success
              ? selectedProgram.data.selectedProgram.id
              : undefined;
            const lockedSelectedProgram = selectedProgramId
              ? await revalidateProgramHeadAssignment(tx, {
                  userId: authSession.userId,
                  programId: selectedProgramId,
                })
              : null;
            if (selectedProgramId && !lockedSelectedProgram) {
              throw new PublicationValidationError("Course assignment not found.");
            }

            if (selectedProgramId && lockedAssignment.program_id !== selectedProgramId) {
              throw new PublicationValidationError("Course assignment not found.");
            }

            const lockedPhProgramScope = selectedProgramId ? [selectedProgramId] : [];
            const lockedAuthCheck = canDeployCourseBoundEvaluation(
              authSession,
              {
                faculty_id: lockedAssignment.faculty_id,
                program_id: lockedAssignment.program_id,
                course_scope: lockedAssignment.course.course_scope as CourseScope,
              },
              lockedPhProgramScope
            );
            if (!lockedAuthCheck.allowed) {
              throw new PublicationValidationError("Course assignment not found.");
            }
            if (!lockedAssignment.is_active) {
              throw new PublicationValidationError("This course assignment is inactive.");
            }
            if (lockedAssignment.term_instance.status !== "ACTIVE") {
              throw new PublicationValidationError("This academic period is not active.");
            }
            if (
              lockedAssignment.course_bound_evaluations.some(
                (evaluation) => evaluation.published_at !== null
              )
            ) {
              throw new PublicationValidationError(
                "This course assignment already has a deployed evaluation."
              );
            }

            // Resolve template identity and version after the assignment lock so a
            // concurrent faculty reassignment cannot publish stale template context.
            const isOnBehalf = authSession.activeRole !== ROLES.FACULTY;
            let effectiveTemplateId = templateId;

            if (isOnBehalf) {
              const boundTemplate = await tx.instrumentTemplate.findFirst({
                where: {
                  bound_course_id: lockedAssignment.course_id,
                  is_active: true,
                  faculty_owner_id: lockedAssignment.faculty_id,
                },
                orderBy: { created_at: "desc" },
                select: { id: true },
              });

              if (!boundTemplate) {
                throw new PublicationValidationError(
                  "On-behalf deployment requires a course-bound template. Please create one first."
                );
              }

              if (templateId !== boundTemplate.id) {
                throw new PublicationValidationError("Course assignment not found.");
              }

              effectiveTemplateId = boundTemplate.id;
            }

            let publicationContext: ServiceResult<FacultyTemplatePublicationContext>;
            if (isOnBehalf) {
              publicationContext = await getOnBehalfTemplatePublicationContext(
                effectiveTemplateId,
                lockedAssignment.faculty_id,
                tx
              );
            } else {
              publicationContext = await getFacultyTemplatePublicationContext(effectiveTemplateId, {
                db: tx,
                facultyId: lockedAssignment.faculty_id,
                courseContext: {
                  courseType: lockedAssignment.course.course_scope,
                  majorName: lockedAssignment.course.major?.name ?? null,
                  programCode: lockedAssignment.program.code,
                  programName: lockedAssignment.program.name,
                  scopeLabel: `${lockedAssignment.program.code} - ${lockedAssignment.course.title}`,
                },
              });
            }

            if (!publicationContext.success) {
              throw new PublicationValidationError(publicationContext.error);
            }

            const contextData = publicationContext.data;
            const templateMatchesAssignment =
              contextData.course.id === lockedAssignment.course_id &&
              (lockedAssignment.course.course_scope === CourseScope.GENERAL_EDUCATION ||
                contextData.programId === lockedAssignment.program_id);
            if (!templateMatchesAssignment) {
              throw new PublicationValidationError("The selected template is not for this course.");
            }

            // New-publication alignment gate: reject before deployment creation
            // when any active CILO lacks a valid active target for the locked
            // Course scope. Runs after the existing template-context validation
            // so no-CILO and binding errors keep their established semantics.
            // Faculty publishers receive a direct repair path.
            const courseScope = lockedAssignment.course.course_scope as CourseScope;
            const publicationAlignment = await classifyPublicationAlignment(
              tx,
              lockedAssignment.course_id,
              courseScope,
              lockedAssignment.course.program_id ?? null
            );
            if (publicationAlignment !== "ready") {
              const targetLabel =
                courseScope === CourseScope.GENERAL_EDUCATION
                  ? "Institutional Outcome"
                  : "Graduate Outcome from the Course's owning Academic Program";
              const isFacultyPublisher = authSession.activeRole === ROLES.FACULTY;
              throw new PublicationValidationError(
                isFacultyPublisher
                  ? `Every active CILO must map to at least one active ${targetLabel} before publishing. Complete the Course alignment to continue.`
                  : `Course ${lockedAssignment.course.code} alignment is incomplete: every active CILO must map to at least one active ${targetLabel} before publishing.`,
                isFacultyPublisher ? lockedAssignment.course_id : undefined
              );
            }

            const latestVersion = await tx.instrumentVersion.findFirst({
              where: {
                is_active: true,
                template_id: effectiveTemplateId,
                template: {
                  id: effectiveTemplateId,
                  is_active: true,
                  template_type: EvaluationTemplateType.COURSE_BOUND,
                },
              },
              orderBy: { version_number: "desc" },
              select: { id: true },
            });

            if (!latestVersion) {
              throw new PublicationValidationError(
                "Course-bound evaluation template is unavailable."
              );
            }

            const memberships = await tx.courseAssignmentMembership.findMany({
              where: { course_assignment_id: assignmentId, is_active: true },
              select: { id: true, student_user_id: true },
            });
            const membershipById = new Map(
              memberships.map((membership) => [membership.id, membership])
            );
            const normalizedExclusions = exclusions.map((exclusion) => ({
              ...exclusion,
              otherExplanation: exclusion.otherExplanation?.trim() || undefined,
            }));
            const excludedMembershipIds = new Set<string>();
            for (const exclusion of normalizedExclusions) {
              const membership = membershipById.get(exclusion.membershipId);
              if (!membership) {
                throw new PublicationValidationError(
                  "Every exclusion must target an active Course-assignment roster member."
                );
              }
              if (excludedMembershipIds.has(exclusion.membershipId)) {
                throw new PublicationValidationError("A roster member can only be excluded once.");
              }
              if (
                exclusion.category === CourseBoundEvaluationExclusionCategory.OTHER &&
                (!exclusion.otherExplanation ||
                  exclusion.otherExplanation.length < 5 ||
                  exclusion.otherExplanation.length > 200 ||
                  !isNeutralOtherExplanation(exclusion.otherExplanation))
              ) {
                throw new PublicationValidationError(
                  "Other exclusion explanations must be 5-200 neutral characters without sensitive details."
                );
              }
              if (
                exclusion.category !== CourseBoundEvaluationExclusionCategory.OTHER &&
                exclusion.otherExplanation
              ) {
                throw new PublicationValidationError(
                  "Only an Other exclusion may include an explanation."
                );
              }
              excludedMembershipIds.add(exclusion.membershipId);
            }

            const respondentIds = memberships
              .filter((membership) => !excludedMembershipIds.has(membership.id))
              .map((membership) => membership.student_user_id);
            if (respondentIds.length === 0) {
              throw new PublicationValidationError(
                "At least one roster member must receive this evaluation."
              );
            }

            const ciloSnapshots = contextData.cilos.map((cilo, index: number) => ({
              description: cilo.description,
              id: cilo.id,
              label: `CILO ${index + 1}`,
            }));

            const evaluation = await tx.courseBoundEvaluation.create({
              data: {
                // Source of truth for class identity (Issue #39)
                course_assignment_id: lockedAssignment.id,
                term_instance_id: lockedAssignment.term_instance_id,
                // On-behalf deployment tracking (Issue #43) - records the correct deployer
                deployed_by: authSession.userId,
                activation_at: activationAt,
                cilos_snapshot: ciloSnapshots,
                course_info_snapshot: {
                  courseCode: lockedAssignment.course.code,
                  courseScope: contextData.course.courseType,
                  courseTitle: lockedAssignment.course.title,
                  majorName: lockedAssignment.course.major?.name ?? null,
                  programCode: lockedAssignment.program.code,
                  programName: lockedAssignment.program.name,
                  ...(lockedAssignment.curriculumCourse && {
                    curriculumCourseId: lockedAssignment.curriculumCourse.id,
                    curriculumVersionId: lockedAssignment.curriculumCourse.curriculum_version_id,
                  }),
                },
                deadline_at: deadlineAt,
                deployment_name: deploymentName.trim(),
                instrument_version_id: latestVersion.id,
                published_at: new Date(),
                status,
              },
            });

            await tx.courseBoundCiloQuestionBinding.createMany({
              data: contextData.bindings.map((binding) => ({
                cilo_description_snapshot: binding.ciloDescriptionSnapshot,
                cilo_id: binding.ciloId,
                course_bound_evaluation_id: evaluation.id,
                item_key: binding.itemKey,
                question_prompt_snapshot: binding.questionPromptSnapshot,
                section_key: binding.sectionKey,
              })),
            });

            await tx.courseBoundEvaluationExclusion.createMany({
              data: normalizedExclusions.map((exclusion) => ({
                category: exclusion.category,
                course_assignment_id: assignmentId,
                course_assignment_membership_id: exclusion.membershipId,
                course_bound_evaluation_id: evaluation.id,
                excluded_by: authSession.userId,
                ...(exclusion.otherExplanation
                  ? { other_explanation: exclusion.otherExplanation }
                  : {}),
              })),
            });

            // Create single target row for the assignment's program/year
            const targetRows = [
              {
                course_bound_evaluation_id: evaluation.id,
                program_id: lockedAssignment.program_id,
                year_level: lockedAssignment.year_level,
              },
            ];

            await tx.courseBoundEvaluationTarget.createMany({
              data: targetRows,
            });

            await tx.evaluationAssignment.createMany({
              data: respondentIds.map((respondentId) => ({
                course_bound_id: evaluation.id,
                respondent_id: respondentId,
              })),
            });

            return {
              success: true,
              data: {
                assignmentCount: respondentIds.length,
                evaluationId: evaluation.id,
                status,
                targetCount: targetRows.length,
              },
            };
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          }
        );

        return result as PublishCourseBoundEvaluationResult;
      } catch (error) {
        if (isTransactionWriteConflict(error) && attempt < 2) continue;
        throw error;
      }
    }

    throw new Error("Publication transaction retry limit exceeded.");
  } catch (error) {
    if (error instanceof PublicationValidationError) {
      return {
        error: error.message,
        success: false,
        ...(error.alignmentCourseId ? { alignmentCourseId: error.alignmentCourseId } : {}),
      };
    }

    if (isUniqueConstraintError(error)) {
      return {
        error: "This course assignment already has a deployed evaluation.",
        success: false,
      };
    }

    const referenceId = randomUUID();
    console.error("Failed to publish course-bound evaluation", {
      operation: "publish_course_bound_evaluation",
      actorId,
      assignmentId,
      referenceId,
      error:
        error instanceof Error
          ? {
              name: error.name,
              code:
                typeof error === "object" && error !== null && "code" in error
                  ? String(error.code)
                  : undefined,
            }
          : { type: typeof error },
    });
    return {
      error: `Failed to publish evaluation. Please try again. Support reference: ${referenceId}.`,
      referenceId,
      success: false,
    };
  }
}
