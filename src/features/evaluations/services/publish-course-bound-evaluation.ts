// fallow-ignore-file code-duplication
import { randomUUID } from "node:crypto";
import { CourseScope, EvaluationTemplateType, Prisma } from "@prisma/client";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import {
  revalidateProgramHeadAssignment,
  resolveProgramHeadContext,
} from "@/features/auth/services/resolve-program-head-context";
import {
  getFacultyTemplatePublicationContext,
  validateCourseBoundGoBindings,
  type FacultyTemplatePublicationContext,
} from "@/features/instruments/services/manage-faculty-templates";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { type ServiceResult } from "@/lib/utils/service-result";
import { type TemplateStructure } from "@/features/instruments/types";
import { canDeployCourseBoundEvaluation } from "../policies";
import {
  buildPublicationStatus,
  planCourseBoundPublication,
  PublicationValidationError,
  toPublicationFailure,
  validateCiloQuestionBindings,
} from "./course-bound-publication-plan";
import {
  classifyCourseAlignment,
  type CourseAlignmentState,
} from "@/features/outcomes/services/classify-course-alignment";
import { buildCourseInfoSnapshotV2 } from "./course-info-snapshot";
import type {
  PublishCourseBoundEvaluationInput,
  PublishCourseBoundEvaluationResult,
} from "../types";

type PublicationContextDb = Prisma.TransactionClient | typeof prisma;

function isTransactionWriteConflict(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2034";
}

/**
 * New-publication alignment gate: for a locked Course, every active CILO must
 * satisfy the Course scope's typed alignment rule before a Course-bound
 * evaluation may be published. General Education follows the at-least-one
 * active Institutional Outcome rule with a non-null manifestation;
 * Program-specific Courses require a non-null manifestation for every active
 * GO of the Course's owning Academic Program (zero active GOs with active
 * CILOs is incomplete). Archived targets, wrong-program rows, and rows without
 * a manifestation never satisfy the gate.
 */
async function classifyPublicationAlignment(
  db: PublicationContextDb,
  courseId: string,
  courseScope: CourseScope,
  owningProgramId: string | null
): Promise<CourseAlignmentState> {
  const [cilos, activeGoIds] = await Promise.all([
    db.cILO.findMany({
      where: { course_id: courseId, is_active: true },
      select: {
        id: true,
        cilo_mappings: {
          select: {
            manifestation: true,
            go: { select: { id: true, program_id: true, is_active: true } },
          },
        },
        cilo_institutional_outcome_mappings: {
          select: {
            manifestation: true,
            institutional_outcome: { select: { is_active: true } },
          },
        },
      },
    }),
    courseScope === CourseScope.GENERAL_EDUCATION || owningProgramId === null
      ? []
      : db.gO.findMany({
          where: { program_id: owningProgramId, is_active: true },
          select: { id: true },
        }),
  ]);
  return classifyCourseAlignment(
    cilos,
    courseScope,
    owningProgramId,
    activeGoIds.map((go) => go.id)
  );
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
      template_go_question_bindings: true,
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

  const ciloBindingValidation = validateCiloQuestionBindings({
    bindings: template.template_cilo_question_bindings,
    cilos,
    structure,
  });
  if (!ciloBindingValidation.success) {
    return ciloBindingValidation;
  }
  const validatedBindings = ciloBindingValidation.bindings;

  // Direct question-GO bindings stay optional: an unbound Likert question
  // publishes as a general item. A null go_id means its GO was deleted
  // after the draft was saved (FK SET NULL). Block like an archived or
  // foreign GO so the loss is explicit, matching the central publish
  // plan, instead of silently dropping the intended coverage. The next
  // draft save prunes the row.
  if (template.template_go_question_bindings.some((binding) => !binding.go_id)) {
    return {
      success: false,
      error: "One or more selected Graduate Outcomes are not available to this course.",
    };
  }
  const goBindingValidation = await validateCourseBoundGoBindings({
    bindings: template.template_go_question_bindings
      .filter((binding) => binding.go_id)
      .map((binding) => ({
        goId: binding.go_id!,
        itemKey: binding.item_key,
        sectionKey: binding.section_key,
      })),
    boundCourseId: template.bound_course_id,
    structure,
    db,
    ciloBindings: validatedBindings,
  });

  if (!goBindingValidation.success) {
    return goBindingValidation;
  }

  return {
    success: true,
    data: {
      bindings: validatedBindings,
      cilos,
      goBindings: goBindingValidation.bindings,
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
                faculty: { select: { name: true } },
                term_instance: { include: { school_year: { select: { code: true } } } },
                course_bound_evaluations: { select: { published_at: true } },
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
            // when any active CILO fails the Course scope's typed alignment
            // rule (exhaustive manifestation coverage for Program-specific
            // Courses, at-least-one active Institutional Outcome for General
            // Education). Runs after the existing template-context validation
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
              const isFacultyPublisher = authSession.activeRole === ROLES.FACULTY;
              const requirement =
                courseScope === CourseScope.GENERAL_EDUCATION
                  ? "map to at least one active Institutional Outcome"
                  : "have a manifestation of every active Graduate Outcome of the Course's owning Academic Program";
              throw new PublicationValidationError(
                isFacultyPublisher
                  ? `Every active CILO must ${requirement} before publishing. Complete the Course alignment to continue.`
                  : `Course ${lockedAssignment.course.code} alignment is incomplete: every active CILO must ${requirement} before publishing.`,
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
            const plan = planCourseBoundPublication({
              cilos: contextData.cilos,
              exclusions,
              memberships,
            });
            const { ciloSnapshots, normalizedExclusions, respondentIds } = plan;

            const publishedAt = new Date();
            const evaluation = await tx.courseBoundEvaluation.create({
              data: {
                // Source of truth for class identity (Issue #39)
                course_assignment_id: lockedAssignment.id,
                term_instance_id: lockedAssignment.term_instance_id,
                // On-behalf deployment tracking (Issue #43) - records the correct deployer
                deployed_by: authSession.userId,
                activation_at: activationAt,
                cilos_snapshot: ciloSnapshots,
                course_info_snapshot: buildCourseInfoSnapshotV2({
                  courseAssignmentId: lockedAssignment.id,
                  courseId: lockedAssignment.course_id,
                  courseCode: lockedAssignment.course.code,
                  courseTitle: lockedAssignment.course.title,
                  courseScope: lockedAssignment.course.course_scope,
                  programId: lockedAssignment.program_id,
                  programCode: lockedAssignment.program.code,
                  programName: lockedAssignment.program.name,
                  majorId: lockedAssignment.course.major_id,
                  majorName: lockedAssignment.course.major?.name ?? null,
                  termInstanceId: lockedAssignment.term_instance_id,
                  schoolYearCode: lockedAssignment.term_instance.school_year.code,
                  semester: lockedAssignment.term_instance.semester,
                  term: lockedAssignment.term_instance.term,
                  yearLevel: lockedAssignment.year_level,
                  section: lockedAssignment.section,
                  facultyId: lockedAssignment.faculty_id,
                  facultyName: lockedAssignment.faculty.name,
                  capturedAt: publishedAt,
                  assignmentContextSource: "PUBLICATION",
                }),
                deadline_at: deadlineAt,
                deployment_name: deploymentName.trim(),
                instrument_version_id: latestVersion.id,
                published_at: publishedAt,
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

            // Direct question–GO bindings are frozen here: evidence for the
            // selected-Program GO rows must not change when the GO catalog is
            // later edited. An unbound Likert question writes no row and
            // contributes no GO evidence, exactly like the Program-wide path.
            if (contextData.goBindings.length > 0) {
              await tx.courseBoundGoQuestionBinding.createMany({
                data: contextData.goBindings.map((binding) => ({
                  course_bound_evaluation_id: evaluation.id,
                  go_code_snapshot: binding.goCodeSnapshot,
                  go_description_snapshot: binding.goDescriptionSnapshot,
                  go_id: binding.goId,
                  item_key: binding.itemKey,
                  question_prompt_snapshot: binding.questionPromptSnapshot,
                  section_key: binding.sectionKey,
                })),
              });
            }

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
    return toPublicationFailure(error, { actorId, assignmentId, referenceId: randomUUID() });
  }
}
