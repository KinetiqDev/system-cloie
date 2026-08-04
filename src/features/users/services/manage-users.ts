import { InviteStatus, Prisma, SystemRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type {
  AssignRoleInput,
  CreateExternalInviteDraftInput,
  CreateFacultyAffiliationInput,
  CreateProgramHeadAssignmentInput,
  UpdateIndustryPartnerProfileInput,
  UpdateStudentAcademicContextInput,
} from "../schemas/secretary-user";

import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { type ServiceResult } from "@/lib/utils/service-result";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";

async function userHasRole(userId: string, role: SystemRole) {
  const record = await prisma.userRole.findUnique({
    where: { user_id: userId },
    select: { role: true },
  });

  return record?.role === role;
}

async function ensureProgramMajorRelation(programId: string, majorId?: string) {
  if (!majorId) {
    return { success: true as const };
  }

  const major = await prisma.major.findUnique({
    where: { id: majorId },
    select: { id: true, program_id: true },
  });

  if (!major) {
    return { success: false as const, error: "Selected major was not found." };
  }

  if (major.program_id !== programId) {
    return {
      success: false as const,
      error: "Selected major does not belong to the selected program.",
    };
  }

  return { success: true as const };
}

async function listAdminUsers() {
  return prisma.user.findMany({
    include: {
      roles: {
        orderBy: { role: "asc" },
      },
      student_profile: {
        include: {
          major: true,
          program: true,
        },
      },
      faculty_program_affiliations: {
        orderBy: {
          program: {
            code: "asc",
          },
        },
        include: {
          program: true,
        },
      },
      program_head_assignments: {
        orderBy: {
          program: {
            code: "asc",
          },
        },
        include: {
          program: true,
        },
      },
      industry_partner_profile: {
        include: {
          program: true,
        },
      },
    },
    orderBy: [{ last_name: "asc" }, { first_name: "asc" }],
  });
}

async function listExternalStakeholderInvites() {
  return prisma.externalStakeholderInvite.findMany({
    include: {
      program: true,
    },
    orderBy: [{ status: "asc" }, { created_at: "desc" }],
  });
}

export async function toggleUserActive(id: string, is_active: boolean): Promise<ServiceResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { success: false, error: "Authentication required." };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { success: false, error: "Insufficient permissions." };
  }
  if (id === session.userId) return { success: false, error: "Cannot modify own account." };

  await prisma.user.update({
    where: { id },
    data: { is_active },
  });

  return { success: true, data: undefined };
}

export async function assignUserRole(
  input: AssignRoleInput
): Promise<ServiceResult<{ id: string }>> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { success: false, error: "Authentication required." };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { success: false, error: "Insufficient permissions." };
  }
  if (input.user_id === session.userId) return { success: false, error: "Cannot modify own account." };

  try {
    const role = await prisma.userRole.create({
      data: {
        user_id: input.user_id,
        role: input.role,
      },
    });

    return { success: true, data: { id: role.id } };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error: `${input.role.replaceAll("_", " ")} is already assigned to this user.`,
      };
    }

    throw error;
  }
}

/** Expected denial thrown by the revocation transaction for the assignment gate. */
class ActiveProgramHeadAssignmentsError extends Error {
  constructor() {
    super("Deactivate all program-head assignments before revoking the Program Head role.");
    this.name = "ActiveProgramHeadAssignmentsError";
  }
}

/** Expected denial thrown by the activation transaction when the role is missing. */
class MissingProgramHeadRoleError extends Error {
  constructor() {
    super("Assign the Program Head role before linking a program assignment.");
    this.name = "MissingProgramHeadRoleError";
  }
}

export async function revokeUserRole(userId: string, role: SystemRole): Promise<ServiceResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { success: false, error: "Authentication required." };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { success: false, error: "Insufficient permissions." };
  }
  if (userId === session.userId) return { success: false, error: "Cannot modify own account." };

  const assignedRole = await prisma.userRole.findUnique({
    where: { user_id: userId },
  });

  if (!assignedRole || assignedRole.role !== role) {
    return { success: false, error: "Role assignment not found." };
  }

  if (role === SystemRole.STUDENT) {
    const profile = await prisma.studentAcademicProfile.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (profile) {
      return {
        success: false,
        error: "Remove the student academic context before revoking the Student role.",
      };
    }
  }

  if (role === SystemRole.FACULTY) {
    const activeAffiliations = await prisma.facultyProgramAffiliation.count({
      where: {
        faculty_id: userId,
        is_active: true,
      },
    });

    if (activeAffiliations > 0) {
      return {
        success: false,
        error: "Deactivate all faculty-program affiliations before revoking the Faculty role.",
      };
    }
  }

  if (role === SystemRole.PROGRAM_HEAD) {
    // The role can only be revoked while no assignment is active. The count
    // and the delete run in one transaction under the same advisory lock as
    // assignment-set administration so a concurrent activation cannot slip
    // between the check and the role deletion.
    const programHeadUserId = userId;
    try {
      await prisma.$transaction(async (tx) => {
        await lockProgramHeadAssignmentSet(tx, programHeadUserId);
        const activeAssignments = await tx.programHeadAssignment.count({
          where: {
            program_head_id: programHeadUserId,
            is_active: true,
          },
        });

        if (activeAssignments > 0) {
          throw new ActiveProgramHeadAssignmentsError();
        }

        await tx.userRole.delete({
          where: { user_id: programHeadUserId },
        });
      });
    } catch (error) {
      // Convert only the expected assignment-gate denial; database failures
      // propagate to the caller's error boundary.
      if (error instanceof ActiveProgramHeadAssignmentsError) {
        return { success: false, error: error.message };
      }
      throw error;
    }

    return { success: true, data: undefined };
  }

  if (role === SystemRole.INDUSTRY_PARTNER) {
    const profile = await prisma.industryPartnerProfile.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (profile) {
      return {
        success: false,
        error: "Remove the industry partner profile before revoking the Industry Partner role.",
      };
    }
  }

  await prisma.userRole.delete({
    where: { user_id: userId },
  });

  return { success: true, data: undefined };
}

export async function upsertStudentAcademicContext(
  input: UpdateStudentAcademicContextInput
): Promise<ServiceResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { success: false, error: "Authentication required." };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { success: false, error: "Insufficient permissions." };
  }

  const hasStudentRole = await userHasRole(input.user_id, SystemRole.STUDENT);

  if (!hasStudentRole) {
    return {
      success: false,
      error: "Assign the Student role before saving academic context.",
    };
  }

  const programMajorCheck = await ensureProgramMajorRelation(input.program_id, input.major_id);

  if (!programMajorCheck.success) {
    return programMajorCheck;
  }

  // Phase 9: Only update static cohort fields - enrollment data is in StudentEnrollment
  await prisma.studentAcademicProfile.upsert({
    where: { user_id: input.user_id },
    update: {
      program_id: input.program_id,
      major_id: input.major_id ?? null,
      student_id_number: input.student_id_number ?? null,
    },
    create: {
      user_id: input.user_id,
      program_id: input.program_id,
      major_id: input.major_id ?? null,
      student_id_number: input.student_id_number ?? null,
    },
  });

  return { success: true, data: undefined };
}

export async function deleteStudentAcademicContext(userId: string): Promise<ServiceResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { success: false, error: "Authentication required." };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { success: false, error: "Insufficient permissions." };
  }
  if (userId === session.userId) {
    return { success: false, error: "Cannot modify own account." };
  }

  const profile = await prisma.studentAcademicProfile.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });

  if (!profile) {
    return { success: false, error: "Student academic context not found." };
  }

  await prisma.studentAcademicProfile.delete({
    where: { user_id: userId },
  });

  return { success: true, data: undefined };
}

export async function createFacultyProgramAffiliation(
  input: CreateFacultyAffiliationInput
): Promise<ServiceResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { success: false, error: "Authentication required." };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { success: false, error: "Insufficient permissions." };
  }
  if (input.faculty_id === session.userId) {
    return { success: false, error: "Cannot modify own account." };
  }

  const hasFacultyRole = await userHasRole(input.faculty_id, SystemRole.FACULTY);

  if (!hasFacultyRole) {
    return {
      success: false,
      error: "Assign the Faculty role before adding a faculty-program affiliation.",
    };
  }

  try {
    await prisma.facultyProgramAffiliation.upsert({
      where: {
        faculty_id_program_id: {
          faculty_id: input.faculty_id,
          program_id: input.program_id,
        },
      },
      update: {
        is_active: true,
      },
      create: {
        faculty_id: input.faculty_id,
        program_id: input.program_id,
        is_active: true,
      },
    });

    return { success: true, data: undefined };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error: "This faculty-program affiliation already exists.",
      };
    }

    throw error;
  }
}

export async function deactivateFacultyProgramAffiliation(id: string): Promise<ServiceResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { success: false, error: "Authentication required." };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { success: false, error: "Insufficient permissions." };
  }

  await prisma.facultyProgramAffiliation.update({
    where: { id },
    data: {
      is_active: false,
    },
  });

  return { success: true, data: undefined };
}

export async function createProgramHeadAssignment(
  input: CreateProgramHeadAssignmentInput
): Promise<ServiceResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { success: false, error: "Authentication required." };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { success: false, error: "Insufficient permissions." };
  }
  if (input.program_head_id === session.userId) return { success: false, error: "Cannot modify own account." };

  const hasProgramHeadRole = await userHasRole(input.program_head_id, SystemRole.PROGRAM_HEAD);

  if (!hasProgramHeadRole) {
    return {
      success: false,
      error: "Assign the Program Head role before linking a program assignment.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Re-verify the target still has the Program Head role under the same
      // advisory lock as assignment-set administration and role revocation,
      // so a concurrent revocation cannot race the activation.
      await lockProgramHeadAssignmentSet(tx, input.program_head_id);
      const roleRecord = await tx.userRole.findUnique({
        where: { user_id: input.program_head_id },
        select: { role: true },
      });
      if (!roleRecord || roleRecord.role !== SystemRole.PROGRAM_HEAD) {
        throw new MissingProgramHeadRoleError();
      }

      await tx.programHeadAssignment.upsert({
        where: {
          program_head_id_program_id: {
            program_head_id: input.program_head_id,
            program_id: input.program_id,
          },
        },
        update: {
          is_active: true,
        },
        create: {
          program_head_id: input.program_head_id,
          program_id: input.program_id,
          is_active: true,
        },
      });
    });

    return { success: true, data: undefined };
  } catch (error) {
    // Convert the expected concurrent-revocation denial; real database
    // failures propagate to the caller's error boundary.
    if (error instanceof MissingProgramHeadRoleError) {
      return {
        success: false,
        error: error.message,
      };
    }
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error: "This program-head assignment already exists.",
      };
    }

    throw error;
  }
}

export async function deactivateProgramHeadAssignment(
  assignmentId: string,
  programHeadId: string
): Promise<ServiceResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { success: false, error: "Authentication required." };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { success: false, error: "Insufficient permissions." };
  }

  await prisma.$transaction(async (tx) => {
    // Acquire the per-Program-Head advisory lock before reading any
    // assignment row, matching createProgramHeadAssignment and
    // revokeUserRole. The lock key is the owning user id, which the caller
    // supplies, so the row read and write below run under the same lock as
    // assignment-set administration. The ownership check keeps a mismatched
    // caller from deactivating a row while holding another user's lock.
    await lockProgramHeadAssignmentSet(tx, programHeadId);

    const assignment = await tx.programHeadAssignment.findUnique({
      where: { id: assignmentId },
      select: { program_head_id: true },
    });
    if (!assignment) {
      throw new Error("Program head assignment not found.");
    }
    if (assignment.program_head_id !== programHeadId) {
      throw new Error("Program head assignment does not belong to the target user.");
    }
    await tx.programHeadAssignment.update({
      where: { id: assignmentId },
      data: { is_active: false },
    });
  });

  return { success: true, data: undefined };
}

/**
 * A write client that already holds the per-Program-Head advisory lock.
 * PrismaClient and TransactionClient expose the same model-delegate surface,
 * so Prisma's types cannot distinguish a locked transaction from a bare
 * client. Only `lockProgramHeadAssignmentSet` produces this brand (via the
 * required unique-symbol member), which makes passing an un-locked client to
 * `applyProgramHeadAssignmentSet` a compile error instead of a silent
 * lock-free call.
 */
declare const programHeadAssignmentSetLock: unique symbol;

export type ProgramHeadAssignmentSetLock = Prisma.TransactionClient & {
  readonly [programHeadAssignmentSetLock]: true;
};

/**
 * Serializes Program Head assignment-set administration for one target user.
 * All assignment-set writers and the Program Head role revocation gate take
 * this Postgres advisory transaction lock, so a concurrent assignment edit,
 * standalone assignment write, or role revocation cannot interleave with the
 * transaction re-read of the set (the stale-confirmation check). The key is
 * hashed with `hashtextextended` (64-bit) so distinct Program Head user ids
 * cannot collide onto the same 32-bit advisory-lock key and serialize
 * unrelated transactions.
 */
export async function lockProgramHeadAssignmentSet(
  tx: Prisma.TransactionClient,
  userId: string
): Promise<ProgramHeadAssignmentSetLock> {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`cloie:program-head-assignment-set:${userId}`}, 0))`;
  return tx as ProgramHeadAssignmentSetLock;
}

/**
 * Applies a complete Program Head assignment set inside a write transaction.
 * The caller must pass the locked client returned by
 * `lockProgramHeadAssignmentSet`; acquiring the advisory lock first is what
 * makes the multi-step updateMany/upsert serialized against other
 * assignment-set writers. This is the shared lifecycle used by the Secretary
 * protected edit flow and mirrors the upsert/reactivation and deactivation
 * semantics of `createProgramHeadAssignment` and
 * `deactivateProgramHeadAssignment`: selected existing rows (including
 * historical rows) are activated or reactivated, selected Programs without a
 * row receive exactly one new row, and unselected active rows are
 * deactivated. No row is ever deleted or recreated solely to change
 * selection. The compound `(program_head_id, program_id)` unique key turns a
 * concurrent duplicate activation race into a safe activation instead of a
 * duplicate row.
 */
export async function applyProgramHeadAssignmentSet(
  tx: ProgramHeadAssignmentSetLock,
  input: { programHeadId: string; programIds: string[] }
): Promise<void> {
  const { programHeadId } = input;
  const programIds = [...new Set(input.programIds)];

  if (programIds.length === 0) {
    await tx.programHeadAssignment.updateMany({
      where: { program_head_id: programHeadId, is_active: true },
      data: { is_active: false },
    });
    return;
  }

  await tx.programHeadAssignment.updateMany({
    where: {
      program_head_id: programHeadId,
      is_active: true,
      program_id: { notIn: programIds },
    },
    data: { is_active: false },
  });

  for (const programId of programIds) {
    await tx.programHeadAssignment.upsert({
      where: {
        program_head_id_program_id: { program_head_id: programHeadId, program_id: programId },
      },
      create: {
        program_head_id: programHeadId,
        program_id: programId,
        is_active: true,
      },
      update: { is_active: true },
    });
  }
}

export async function upsertIndustryPartnerProfile(
  input: UpdateIndustryPartnerProfileInput
): Promise<ServiceResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { success: false, error: "Authentication required." };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { success: false, error: "Insufficient permissions." };
  }

  const hasIndustryRole = await userHasRole(input.user_id, SystemRole.INDUSTRY_PARTNER);

  if (!hasIndustryRole) {
    return {
      success: false,
      error: "Assign the Industry Partner role before saving a partner profile.",
    };
  }

  await prisma.industryPartnerProfile.upsert({
    where: { user_id: input.user_id },
    update: {
      company_name: input.company_name,
      position: input.position ?? null,
      program_id: input.program_id ?? null,
    },
    create: {
      user_id: input.user_id,
      company_name: input.company_name,
      position: input.position ?? null,
      program_id: input.program_id ?? null,
    },
  });

  return { success: true, data: undefined };
}

export async function deleteIndustryPartnerProfile(userId: string): Promise<ServiceResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { success: false, error: "Authentication required." };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { success: false, error: "Insufficient permissions." };
  }
  if (userId === session.userId) {
    return { success: false, error: "Cannot modify own account." };
  }

  const profile = await prisma.industryPartnerProfile.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });

  if (!profile) {
    return { success: false, error: "Industry partner profile not found." };
  }

  await prisma.industryPartnerProfile.delete({
    where: { user_id: userId },
  });

  return { success: true, data: undefined };
}

export async function createExternalInviteDraft(
  input: CreateExternalInviteDraftInput
): Promise<ServiceResult<{ id: string }>> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { success: false, error: "Authentication required." };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { success: false, error: "Insufficient permissions." };
  }

  try {
    const invite = await prisma.externalStakeholderInvite.create({
      data: {
        email: input.email,
        role: input.role,
        program_id: input.program_id ?? null,
        invitee_name: input.invitee_name ?? null,
        company_name: input.company_name ?? null,
        note: input.note ?? null,
        status: InviteStatus.DRAFT,
      },
    });

    return { success: true, data: { id: invite.id } };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error: "An invite draft already exists for this email, role, and program.",
      };
    }

    throw error;
  }
}

export async function updateExternalInviteStatus(
  id: string,
  status: InviteStatus
): Promise<ServiceResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { success: false, error: "Authentication required." };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { success: false, error: "Insufficient permissions." };
  }

  const invite = await prisma.externalStakeholderInvite.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!invite) {
    return { success: false, error: "Invite draft not found." };
  }

  if (invite.status === InviteStatus.ACCEPTED && status !== InviteStatus.ACCEPTED) {
    return {
      success: false,
      error: "Accepted invites cannot be reverted from the admin draft flow.",
    };
  }

  await prisma.externalStakeholderInvite.update({
    where: { id },
    data: {
      status,
    },
  });

  return { success: true, data: undefined };
}
