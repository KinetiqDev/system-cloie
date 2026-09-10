import { TargetStakeholder } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { listStudentsForClass } from "@/features/enrollments/services/list-students-for-class";
import {
  listEligibleAlumni,
  listEligibleIndustryPartners,
} from "./central-stakeholder-eligibility";
import type {
  PreviewCentralDeploymentInput,
  PreviewCentralDeploymentRespondent,
  PreviewCentralDeploymentResult,
} from "../types";

export async function previewCentralDeploymentRespondents(
  input: PreviewCentralDeploymentInput
): Promise<PreviewCentralDeploymentResult> {
  const contextResult = await resolveProgramHeadContext(input.programId);
  if (!contextResult.success) return contextResult;

  try {
    let respondents: PreviewCentralDeploymentRespondent[] = [];

    if (input.targetStakeholder === TargetStakeholder.STUDENT) {
      respondents = await previewStudents(input);
    } else if (input.targetStakeholder === TargetStakeholder.ALUMNI) {
      const eligible = await listEligibleAlumni(prisma, {
        programId: input.programId,
        majorId: input.majorId,
      });
      respondents = eligible.map((respondent) => ({
        email: respondent.email,
        majorName: respondent.majorName,
        name: respondent.name,
        programCode: respondent.programCode,
        stakeholderType: TargetStakeholder.ALUMNI,
        userId: respondent.userId,
        yearLevel: null,
      }));
    } else if (input.targetStakeholder === TargetStakeholder.INDUSTRY_PARTNER) {
      const eligible = await listEligibleIndustryPartners(prisma, { programId: input.programId });
      respondents = eligible.map((respondent) => ({
        email: respondent.email,
        majorName: respondent.majorName,
        name: respondent.name,
        programCode: respondent.programCode,
        stakeholderType: TargetStakeholder.INDUSTRY_PARTNER,
        userId: respondent.userId,
        yearLevel: null,
      }));
    }

    return {
      success: true,
      data: respondents,
    };
  } catch (error) {
    console.error("Failed to preview central deployment respondents:", error);
    return {
      error: "Failed to load respondent preview. Please try again.",
      success: false,
    };
  }
}

// ─── Student Preview ──────────────────────────────────────────────────────────

async function previewStudents(
  input: PreviewCentralDeploymentInput
): Promise<PreviewCentralDeploymentRespondent[]> {
  // Phase 7: Use enrollment-based lookup when termInstanceId is provided
  if (input.termInstanceId && input.yearLevel) {
    const studentsResult = await listStudentsForClass({
      termInstanceId: input.termInstanceId,
      programId: input.programId,
      yearLevel: input.yearLevel,
      majorId: input.majorId,
    });

    if (!studentsResult.success) {
      return [];
    }

    // Get program code for mapping
    const program = await prisma.program.findUnique({
      where: { id: input.programId },
      select: { code: true },
    });

    return studentsResult.data.map((student) => ({
      email: student.email,
      majorName: student.majorName,
      name: student.name,
      programCode: program?.code ?? null,
      stakeholderType: TargetStakeholder.STUDENT,
      userId: student.userId,
      yearLevel: input.yearLevel ?? null,
    }));
  }

  return [];
}
