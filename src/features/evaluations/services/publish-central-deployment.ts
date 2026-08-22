import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import {
  revalidateProgramHeadAssignment,
  resolveProgramHeadContext,
} from "@/features/auth/services/resolve-program-head-context";
import type { PublishCentralDeploymentInput } from "../schemas/central-deployment";
import { listStudentsForClass } from "@/features/enrollments/services/list-students-for-class";
import {
  DeploymentStatus,
  EvaluationTemplateType,
  type TargetStakeholder,
} from "@prisma/client";
import { listTemplateLikertQuestions, type TemplateStructure } from "@/features/instruments/types";
import { type ServiceResult } from "@/lib/utils/service-result";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";

// ─── Types ───────────────────────────────────────────────────────────────────



export type PublishCentralDeploymentResult = ServiceResult<{
  deploymentId: string;
  assignmentCount: number;
  status: "ACTIVE" | "SCHEDULED";
}>;

export type CentralDeploymentPloSnapshotRow = {
  plo_id: string;
  plo_code: string;
  plo_description: string;
  section_key: string;
  item_key: string;
  question_prompt: string;
};

/**
 * Validates a Program-wide template's question–PLO bindings for publication:
 * every Likert question must be bound to at least one PLO and every bound PLO
 * must still be active and owned by the program. Returns the immutable
 * id/code/description snapshot rows captured at publish time.
 */
export function validatePublishPloBindings(input: {
  bindings: Array<{ plo_id: string | null; section_key: string; item_key: string }>;
  structure: TemplateStructure;
  livePlos: Array<{ id: string; code: string; description: string }>;
}):
  | { success: true; snapshotRows: CentralDeploymentPloSnapshotRow[] }
  | { success: false; error: string } {
  const questions = listTemplateLikertQuestions(input.structure);
  const questionMap = new Map(
    questions.map((question) => [`${question.sectionKey}:${question.itemKey}`, question])
  );
  const ploMap = new Map(input.livePlos.map((plo) => [plo.id, plo]));
  const boundQuestionKeys = new Set<string>();
  const snapshotRows: CentralDeploymentPloSnapshotRow[] = [];

  for (const binding of input.bindings) {
    const questionKey = `${binding.section_key}:${binding.item_key}`;
    const question = questionMap.get(questionKey);
    const plo = binding.plo_id ? ploMap.get(binding.plo_id) : undefined;

    if (!question) {
      return {
        success: false,
        error:
          "One or more question–PLO bindings no longer match the template structure.",
      };
    }

    if (!plo) {
      return {
        success: false,
        error:
          "One or more bound PLOs are archived or no longer available. Update the template before publishing.",
      };
    }

    boundQuestionKeys.add(questionKey);
    snapshotRows.push({
      plo_id: plo.id,
      plo_code: plo.code,
      plo_description: plo.description,
      section_key: binding.section_key,
      item_key: binding.item_key,
      question_prompt: question.prompt,
    });
  }

  const missingQuestionKeys = questions.filter(
    (question) => !boundQuestionKeys.has(`${question.sectionKey}:${question.itemKey}`)
  );

  if (missingQuestionKeys.length > 0) {
    return {
      success: false,
      error: "Every Likert question must be assigned to at least one PLO before publishing.",
    };
  }

  return { success: true, snapshotRows };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeDeploymentStatus(activationAt: Date | undefined): "ACTIVE" | "SCHEDULED" {
  if (activationAt && activationAt.getTime() > Date.now()) {
    return DeploymentStatus.SCHEDULED;
  }

  return DeploymentStatus.ACTIVE;
}



// ─── Main Service ────────────────────────────────────────────────────────────

export async function publishCentralDeployment(
  input: PublishCentralDeploymentInput
): Promise<PublishCentralDeploymentResult> {
  // 1. Authenticate and check role
  const authSession = await resolveAuthSession();

  if (authSession?.activeRole !== ROLES.PROGRAM_HEAD) {
    return {
      success: false,
      error: "Program Head authentication is required.",
    };
  }

  if (!input.deployment_name.trim()) {
    return {
      success: false,
      error: "Deployment name is required.",
    };
  }

  if (input.target_stakeholder === "STUDENT" && !input.year_level) {
    return {
      success: false,
      error: "Year level is required when publishing to students.",
    };
  }

  const contextResult = await resolveProgramHeadContext(input.programId);
  if (!contextResult.success) return contextResult;
  const { userId, selectedProgram } = contextResult.data;
  const programId = selectedProgram.id;

  // 3. Validate template — must be active and owned by PH's program or institutional baseline
  const template = await prisma.instrumentTemplate.findFirst({
    where: {
      id: input.template_id,
      is_active: true,
      OR: [{ program_id: programId }, { program_id: null }],
      template_type: EvaluationTemplateType.PROGRAM_WIDE,
    },
    select: {
      id: true,
      name: true,
      program_id: true,
      template_type: true,
      structure: true,
      template_plo_question_bindings: true,
    },
  });

  if (!template) {
    return {
      success: false,
      error: "Template not found, inactive, or not accessible to your program.",
    };
  }

  // 4. Get the latest active InstrumentVersion for the template
  const latestVersion = await prisma.instrumentVersion.findFirst({
    where: {
      template_id: template.id,
      is_active: true,
    },
    orderBy: { version_number: "desc" },
    select: { id: true },
  });

  if (!latestVersion) {
    return {
      success: false,
      error: "No active instrument version found for this template.",
    };
  }

  // 4b. Validate question–PLO bindings: every Likert question must be bound to
  // at least one active program PLO; snapshot id/code/description for the deployment.
  if (!Array.isArray(template.structure)) {
    return { success: false, error: "Template structure is invalid." };
  }
  const structure = template.structure as unknown as TemplateStructure;
  const bindings = template.template_plo_question_bindings;
  let ploSnapshotRows: CentralDeploymentPloSnapshotRow[] = [];
  if (bindings.length > 0) {
    const livePlos = await prisma.pLO.findMany({
      where: {
        program_id: programId,
        id: {
          in: bindings
            .map((binding) => binding.plo_id)
            .filter((ploId): ploId is string => Boolean(ploId)),
        },
        is_active: true,
      },
      select: { id: true, code: true, description: true },
    });

    const ploValidation = validatePublishPloBindings({
      bindings,
      structure,
      livePlos,
    });

    if (!ploValidation.success) {
      return { success: false, error: ploValidation.error };
    }

    ploSnapshotRows = ploValidation.snapshotRows;
  } else if (listTemplateLikertQuestions(structure).length > 0) {
    return {
      success: false,
      error: "Every Likert question must be assigned to at least one PLO before publishing.",
    };
  }

  // 5. Validate deadline > activation if both are set
  if (input.activation_at && input.deadline_at) {
    if (input.deadline_at.getTime() <= input.activation_at.getTime()) {
      return {
        success: false,
        error: "Deadline must be after the activation date.",
      };
    }
  }

  // 6. Compute deployment status
  const status = computeDeploymentStatus(input.activation_at);

  // 7. Check for duplicate deployment
  // Phase 7: If term_instance_id provided, use it for duplicate check
  // Phase 9: term_instance_id is now required for duplicate checking
  if (!input.term_instance_id) {
    return {
      success: false,
      error: "term_instance_id is required.",
    };
  }

  const duplicateWhereClause = {
    instrument_version_id: latestVersion.id,
    program_id: programId,
    target_stakeholder: input.target_stakeholder as TargetStakeholder,
    year_level: input.year_level ?? null,
    term_instance_id: input.term_instance_id,
  };

  const existingDeployment = await prisma.centralDeployment.findFirst({
    where: duplicateWhereClause,
    select: { id: true },
  });

  if (existingDeployment) {
    return {
      success: false,
      error:
        "A deployment already exists for this template version, program, stakeholder, and academic period.",
    };
  }

  // Phase 9: Resolve term details for display
  const termInstance = await prisma.academicTermInstance.findUnique({
    where: { id: input.term_instance_id! },
    include: { school_year: true },
  });

  if (!termInstance) {
    return {
      success: false,
      error: "Term instance not found.",
    };
  }

  // 8. Transaction: create deployment + assignments
  let candidateStudentIds: string[] = [];
  if (input.target_stakeholder === "STUDENT" && input.year_level) {
    const studentsResult = await listStudentsForClass({
      termInstanceId: input.term_instance_id,
      programId,
      yearLevel: input.year_level,
      majorId: input.major_id,
    });
    if (studentsResult.success) {
      candidateStudentIds = studentsResult.data.map((student) => student.userId);
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const currentProgram = await revalidateProgramHeadAssignment(tx, { userId, programId });
      if (!currentProgram) return null;

      const currentTemplate = await tx.instrumentTemplate.findUnique({
        where: { id: input.template_id },
        select: { program_id: true, is_active: true, template_type: true },
      });
      if (
        !currentTemplate ||
        !currentTemplate.is_active ||
        currentTemplate.template_type !== EvaluationTemplateType.PROGRAM_WIDE ||
        (currentTemplate.program_id !== null && currentTemplate.program_id !== programId)
      ) {
        return {
          success: false as const,
          error: "Template not found, inactive, or not accessible to your program.",
        };
      }

      if (input.major_id) {
        const major = await tx.major.findUnique({
          where: { id: input.major_id },
          select: { program_id: true, is_active: true },
        });
        if (!major || !major.is_active || major.program_id !== programId) {
          return { success: false as const, error: "Selected major is not available." };
        }
      }

      let transactionStudentRespondentIds: string[] = [];
      if (input.target_stakeholder === "STUDENT" && input.year_level) {
        const enrollments = await tx.studentEnrollment.findMany({
          where: {
            term_instance_id: input.term_instance_id,
            program_id: programId,
            year_level: input.year_level,
            is_active: true,
            ...(input.major_id ? { major_id: input.major_id } : {}),
            student_user_id: { in: candidateStudentIds },
          },
          select: { student_user_id: true },
        });
        transactionStudentRespondentIds = enrollments.map(
          (enrollment) => enrollment.student_user_id
        );
      }

      // 8a. Create the CentralDeployment record
      // Phase 9: term_instance_id is now the source of truth
      const deployment = await tx.centralDeployment.create({
        data: {
          instrument_version_id: latestVersion.id,
          deployment_name: input.deployment_name,
          program_id: programId,
          major_id: input.major_id ?? null,
          year_level: input.year_level ?? null,
          target_stakeholder: input.target_stakeholder as TargetStakeholder,
          term_instance_id: input.term_instance_id!,
          term: termInstance.term,
          activation_at: input.activation_at ?? null,
          deadline_at: input.deadline_at ?? null,
          status,
        },
      });

      if (ploSnapshotRows.length > 0) {
        await tx.centralDeploymentPloSnapshot.createMany({
          data: ploSnapshotRows.map((row) => ({
            central_deployment_id: deployment.id,
            plo_id: row.plo_id,
            plo_code_snapshot: row.plo_code,
            plo_description_snapshot: row.plo_description,
            section_key: row.section_key,
            item_key: row.item_key,
            question_prompt_snapshot: row.question_prompt,
          })),
        });
      }

      // 8b. Create EvaluationAssignment records for target respondents
      let respondentIds: string[] = [];

      if (input.respondent_ids !== undefined) {
        let eligibleRespondentIds = transactionStudentRespondentIds;
        if (input.target_stakeholder === "ALUMNI") {
          const invites = await tx.externalStakeholderInvite.findMany({
            where: { role: ROLES.ALUMNI, program_id: programId, status: "ACCEPTED" },
            select: { email: true },
          });
          const users = await tx.user.findMany({
            where: { email: { in: invites.map((invite) => invite.email) } },
            select: { id: true },
          });
          eligibleRespondentIds = users.map((user) => user.id);
        } else if (input.target_stakeholder === "INDUSTRY_PARTNER") {
          const [legacyProfiles, affs] = await Promise.all([
            tx.industryPartnerProfile.findMany({ where: { program_id: programId }, select: { user_id: true } }),
            tx.industryPartnerProgramAffiliation.findMany({ where: { program_id: programId }, select: { industry_partner_id: true } }),
          ]);
          eligibleRespondentIds = [...new Set([...legacyProfiles.map((p) => p.user_id), ...affs.map((a) => a.industry_partner_id)])];
        }
        const eligible = new Set(eligibleRespondentIds);
        respondentIds = [...new Set(input.respondent_ids)].filter((id) => eligible.has(id));
      } else if (input.target_stakeholder === "STUDENT") {
        // Enrollment-based lookup via student enrollment ledger
        // Note: term_instance_id is already validated as required at lines 140-145
        if (input.year_level) {
          respondentIds = transactionStudentRespondentIds;
        }
      } else if (input.target_stakeholder === "ALUMNI") {
        // Find accepted alumni invites scoped to this program
        const invites = await tx.externalStakeholderInvite.findMany({
          where: {
            role: ROLES.ALUMNI,
            program_id: programId,
            status: "ACCEPTED",
          },
          select: { email: true },
        });

        if (invites.length > 0) {
          const emails = invites.map((i) => i.email);
          const users = await tx.user.findMany({
            where: { email: { in: emails } },
            select: { id: true },
          });
          respondentIds = [...new Set(users.map((u) => u.id))];
        }
      } else if (input.target_stakeholder === "INDUSTRY_PARTNER") {
        const [legacyProfiles, affs] = await Promise.all([
          tx.industryPartnerProfile.findMany({ where: { program_id: programId }, select: { user_id: true } }),
          tx.industryPartnerProgramAffiliation.findMany({ where: { program_id: programId }, select: { industry_partner_id: true } }),
        ]);
        respondentIds = [...new Set([...legacyProfiles.map((p) => p.user_id), ...affs.map((a) => a.industry_partner_id)])];
      }

      if (respondentIds.length > 0) {
        await tx.evaluationAssignment.createMany({
          data: respondentIds.map((respondentId) => ({
            central_deployment_id: deployment.id,
            respondent_id: respondentId,
          })),
        });
      }

      return {
        deploymentId: deployment.id,
        assignmentCount: respondentIds.length,
        status,
      };
    });

    if (!result) return { success: false, error: "Selected Program is no longer assigned." };
    if ("success" in result && result.success === false) return result;

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error:
          "A deployment already exists for this template version, program, stakeholder, and academic period.",
      };
    }

    throw error;
  }
}

// ─── Close Deployment ────────────────────────────────────────────────────────

export type CloseCentralDeploymentResult = ServiceResult;

export async function closeCentralDeployment(
  programId: string,
  deploymentId: string
): Promise<CloseCentralDeploymentResult> {
  // 1. Authenticate and check role
  const authSession = await resolveAuthSession();

  if (authSession?.activeRole !== ROLES.PROGRAM_HEAD) {
    return {
      success: false,
      error: "Program Head authentication is required.",
    };
  }

  const contextResult = await resolveProgramHeadContext(programId);
  if (!contextResult.success) return contextResult;

  // 3. Load the deployment
  const deployment = await prisma.centralDeployment.findUnique({
    where: { id: deploymentId },
    select: { id: true, program_id: true, status: true },
  });

  if (!deployment) {
    return { success: false, error: "Deployment not found." };
  }

  // 4. Validate scope — PH must own the program
  if (deployment.program_id !== contextResult.data.selectedProgram.id) {
    return {
      success: false,
      error: "You do not have permission to close this deployment.",
    };
  }

  // 5. Validate status — can only close ACTIVE or SCHEDULED deployments
  if (
    deployment.status !== DeploymentStatus.ACTIVE &&
    deployment.status !== DeploymentStatus.SCHEDULED
  ) {
    return {
      success: false,
      error: `Cannot close a deployment with status "${deployment.status}".`,
    };
  }

  // 6. Update status to CLOSED
  const result = await prisma.$transaction(async (tx) => {
    const currentProgram = await revalidateProgramHeadAssignment(tx, {
      userId: contextResult.data.userId,
      programId: contextResult.data.selectedProgram.id,
    });
    if (!currentProgram) return false;
    const currentDeployment = await tx.centralDeployment.findUnique({
      where: { id: deploymentId },
      select: { program_id: true, status: true },
    });
    if (
      !currentDeployment ||
      currentDeployment.program_id !== contextResult.data.selectedProgram.id ||
      (currentDeployment.status !== DeploymentStatus.ACTIVE &&
        currentDeployment.status !== DeploymentStatus.SCHEDULED)
    ) {
      return false;
    }
    await tx.centralDeployment.update({
      where: { id: deploymentId },
      data: { status: DeploymentStatus.CLOSED },
    });
    return true;
  });

  if (!result) return { success: false, error: "You do not have permission to close this deployment." };

  return { success: true, data: undefined };
}
