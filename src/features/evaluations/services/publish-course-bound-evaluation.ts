import { DeploymentStatus, EvaluationTemplateType, CourseScope } from "@prisma/client";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { getFacultyTemplatePublicationContext, type FacultyTemplatePublicationContext } from "@/features/instruments/services/manage-faculty-templates";
import { listStudentsForClass } from "@/features/enrollments/services/list-students-for-class";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { type ServiceResult } from "@/lib/utils/service-result";
import { type TemplateStructure } from "@/features/instruments/types";
import { canDeployCourseBoundEvaluation } from "../policies";
import type {
  PublishCourseBoundEvaluationInput,
  PublishCourseBoundEvaluationResult,
} from "../types";

function buildPublicationStatus(activationAt: Date | null | undefined): "ACTIVE" | "SCHEDULED" {
  if (activationAt && activationAt.getTime() > Date.now()) {
    return DeploymentStatus.SCHEDULED;
  }

  return DeploymentStatus.ACTIVE;
}

function toUniqueValues(values: string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}



/**
 * Bypasses the faculty session checks in getFacultyTemplatePublicationContext for on-behalf deployments.
 */
async function getOnBehalfTemplatePublicationContext(
  templateId: string,
  facultyId: string
): Promise<ServiceResult<FacultyTemplatePublicationContext>> {
  const template = await prisma.instrumentTemplate.findFirst({
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

  const cilos = await prisma.cILO.findMany({
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
    if (section && typeof section === "object" && "questions" in section && Array.isArray(section.questions)) {
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

  const questionMap = new Map(
    likertQuestions.map((q) => [`${q.sectionKey}:${q.itemKey}`, q])
  );
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
  respondentIds: providedRespondentIds,
  templateId,
  deployerId,
}: PublishCourseBoundEvaluationInput): Promise<PublishCourseBoundEvaluationResult> {
  const authSession = await resolveAuthSession();

  if (!authSession) {
    return { error: "Authentication required.", success: false };
  }

  if (!deploymentName.trim()) {
    return { error: "Deployment name is required.", success: false };
  }

  // Lookup the assignment (needed for policy check). Filters inactive at SQL level.
  const assignment = await prisma.courseAssignment.findFirst({
    where: { id: assignmentId, is_active: true },
    include: {
      course: {
        include: {
          major: true,
        },
      },
      program: true,
    },
  });

  if (!assignment) {
    return { error: "Course assignment not found.", success: false };
  }

  if (!assignment.is_active) {
    return { error: "This course assignment is inactive.", success: false };
  }

  // Get PH scope if user is PH - resolves multiple program head assignments
  let phProgramScope: string[] = [];
  if (authSession.roles.includes(ROLES.PROGRAM_HEAD)) {
    const headAssignments = await prisma.programHeadAssignment.findMany({
      where: { program_head_id: authSession.userId, is_active: true },
      select: { program_id: true },
    });
    phProgramScope = headAssignments.map((a) => a.program_id).filter(Boolean) as string[];
  }

  // Call policy for authorization
  const authCheck = canDeployCourseBoundEvaluation(
    authSession,
    {
      faculty_id: assignment.faculty_id,
      program_id: assignment.program_id,
      course_scope: assignment.course.course_scope as CourseScope,
    },
    phProgramScope
  );

  if (!authCheck.allowed) {
    return { error: (authCheck as { allowed: false; reason: string }).reason, success: false };
  }

  // Determine effective template ID (force bound template for on-behalf)
  let effectiveTemplateId = templateId;
  const isOnBehalf = deployerId && deployerId !== assignment.faculty_id;

  if (isOnBehalf) {
    // Force bound template for on-behalf deployments (scoped to the assigned faculty)
    const boundTemplate = await prisma.instrumentTemplate.findFirst({
      where: {
        bound_course_id: assignment.course_id,
        is_active: true,
        faculty_owner_id: assignment.faculty_id,
      },
      orderBy: { created_at: "desc" },
    });

    if (!boundTemplate) {
      return {
        error: "On-behalf deployment requires a course-bound template. Please create one first.",
        success: false,
      };
    }

    effectiveTemplateId = boundTemplate.id;
  }

  // Decouple on-behalf publish from faculty session check
  let publicationContext: ServiceResult<FacultyTemplatePublicationContext>;
  if (isOnBehalf) {
    publicationContext = await getOnBehalfTemplatePublicationContext(
      effectiveTemplateId,
      assignment.faculty_id
    );
  } else {
    publicationContext = await getFacultyTemplatePublicationContext(effectiveTemplateId);
  }

  if (!publicationContext.success) {
    return publicationContext as PublishCourseBoundEvaluationResult;
  }

  const contextData = publicationContext.data;

  // Verify the template's course matches the assignment's course
  if (contextData.course.id !== assignment.course_id) {
    return {
      error: "The selected template is not for this course.",
      success: false,
    };
  }

  // Update version findFirst logic for on-behalf mode (drop faculty_owner_id constraint)
  const latestVersion = await prisma.instrumentVersion.findFirst({
    where: {
      is_active: true,
      template_id: effectiveTemplateId,
      template: {
        id: effectiveTemplateId,
        is_active: true,
        template_type: EvaluationTemplateType.COURSE_BOUND,
      },
    },
    orderBy: {
      version_number: "desc",
    },
    select: {
      id: true,
    },
  });

  if (!latestVersion) {
    return {
      error: "Course-bound evaluation template is unavailable.",
      success: false,
    };
  }

  const status = buildPublicationStatus(activationAt);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const ciloSnapshots = contextData.cilos.map((cilo, index: number) => ({
        description: cilo.description,
        id: cilo.id,
        label: `CILO ${index + 1}`,
      }));

      const evaluation = await tx.courseBoundEvaluation.create({
        data: {
          // Source of truth for class identity (Issue #39)
          course_assignment_id: assignment.id,
          term_instance_id: assignment.term_instance_id,
          // On-behalf deployment tracking (Issue #43) - records the correct deployer
          deployed_by: deployerId || authSession.userId,
          activation_at: activationAt,
          cilos_snapshot: ciloSnapshots,
          course_info_snapshot: {
            courseCode: assignment.course.code,
            courseScope: contextData.course.courseType,
            courseTitle: assignment.course.title,
            majorName: assignment.course.major?.name ?? null,
            programCode: assignment.program.code,
            programName: assignment.program.name,
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

      // Create single target row for the assignment's program/year
      const targetRows = [{
        course_bound_evaluation_id: evaluation.id,
        program_id: assignment.program_id,
        year_level: assignment.year_level,
      }];

      await tx.courseBoundEvaluationTarget.createMany({
        data: targetRows,
      });

      // Determine respondent IDs
      let respondentIds: string[];

      if (providedRespondentIds && providedRespondentIds.length > 0) {
        // Use the confirmed respondent list from preview step
        respondentIds = toUniqueValues(providedRespondentIds);
      } else {
        // Query students from enrollment ledger
        const studentsResult = await listStudentsForClass({
          termInstanceId: assignment.term_instance_id,
          programId: assignment.program_id,
          yearLevel: assignment.year_level,
          section: assignment.section,
        });

        if (!studentsResult.success) {
          throw new Error(studentsResult.error);
        }

        respondentIds = studentsResult.data.map((s) => s.userId);
      }

      if (respondentIds.length > 0) {
        await tx.evaluationAssignment.createMany({
          data: respondentIds.map((respondentId) => ({
            course_bound_id: evaluation.id,
            respondent_id: respondentId,
          })),
        });
      }

      return {
        success: true,
        data: {
          assignmentCount: respondentIds.length,
          evaluationId: evaluation.id,
          status,
          targetCount: targetRows.length,
        },
      };
    });

    return result as PublishCourseBoundEvaluationResult;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        error: "This course assignment already has a deployed evaluation.",
        success: false,
      };
    }

    console.error("Failed to publish course-bound evaluation (V2):", error);
    return {
      error: "Failed to publish evaluation. Please try again.",
      success: false,
    };
  }
}
