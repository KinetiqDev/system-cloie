import { TargetStakeholder } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { listStudentsForClass } from "@/features/enrollments/services/list-students-for-class";
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
      respondents = await previewAlumni(input.programId);
    } else if (input.targetStakeholder === TargetStakeholder.INDUSTRY_PARTNER) {
      respondents = await previewIndustryPartners(input.programId);
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
      studentId: student.studentIdNumber,
      userId: student.userId,
      yearLevel: input.yearLevel ?? null,
    }));
  }

  return [];
}

// ─── Alumni Preview ───────────────────────────────────────────────────────────

async function previewAlumni(
  programId: string
): Promise<PreviewCentralDeploymentRespondent[]> {
  // Find accepted alumni invites scoped to the program
  const invites = await prisma.externalStakeholderInvite.findMany({
    where: {
      role: ROLES.ALUMNI,
      program_id: programId,
      status: "ACCEPTED",
    },
    select: { email: true },
  });

  if (invites.length === 0) return [];

  // Look up the actual User records by their invite emails
  const emails = invites.map((i) => i.email);
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, name: true },
    orderBy: { name: "asc" },
  });

  return users.map((u) => ({
    email: u.email,
    majorName: null,
    name: u.name,
    programCode: null,
    stakeholderType: TargetStakeholder.ALUMNI,
    studentId: null,
    userId: u.id,
    yearLevel: null,
  }));
}

// ─── Industry Partner Preview ─────────────────────────────────────────────────

async function previewIndustryPartners(
  programId: string
): Promise<PreviewCentralDeploymentRespondent[]> {
  const profiles = await prisma.industryPartnerProfile.findMany({
    where: { program_id: programId },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
      program: { select: { code: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  return profiles.map((p) => ({
    email: p.user.email,
    majorName: null,
    name: p.user.name,
    programCode: p.program?.code ?? null,
    stakeholderType: TargetStakeholder.INDUSTRY_PARTNER,
    studentId: null,
    userId: p.user.id,
    yearLevel: null,
  }));
}
