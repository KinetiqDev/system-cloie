import { FacultyApprovalStatus, SystemRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type FacultyAccessRequestOutcome =
  | { success: true; status: FacultyApprovalStatus }
  | { success: false; error: string };

/**
 * Faculty registration is self-submitted but not self-authorized (issue #649).
 *
 * A self-request writes the FACULTY role together with a PENDING request row
 * and creates no program affiliation, so the profile gate blocks the Faculty
 * workspace until a Secretary approves. Approval creates the primary active
 * affiliation in the same transaction that flips the request to APPROVED, so
 * Faculty access never becomes usable on a partial write.
 *
 * Secretary-provisioned Faculty (ADR 0001) does not use this service: it is
 * complete and active at creation time.
 */
export async function requestFacultyAccess(input: {
  userId: string;
  programId: string;
}): Promise<FacultyAccessRequestOutcome> {
  const program = await prisma.program.findUnique({
    where: { id: input.programId },
    select: { id: true, is_active: true },
  });
  if (!program) return { success: false, error: "The selected program does not exist." };
  if (!program.is_active) {
    return { success: false, error: "The selected program is archived or inactive." };
  }

  return prisma.$transaction(async (tx) => {
    // A Secretary-provisioned Faculty account is already active: never let a
    // self-request downgrade it into a pending state.
    const existingAffiliation = await tx.facultyProgramAffiliation.findFirst({
      where: { faculty_id: input.userId, is_active: true },
      select: { id: true },
    });
    if (existingAffiliation) {
      return { success: false as const, error: "Your account already has Faculty access." };
    }

    await tx.userRole.upsert({
      where: { user_id_role: { user_id: input.userId, role: SystemRole.FACULTY } },
      update: {},
      create: { user_id: input.userId, role: SystemRole.FACULTY },
    });

    // A rejected applicant reopens the same row rather than accumulating
    // history the institution never reviews; the decision note is cleared so a
    // stale rejection reason cannot survive the new request.
    const request = await tx.facultyAccessRequest.upsert({
      where: { user_id: input.userId },
      update: {
        program_id: input.programId,
        status: FacultyApprovalStatus.PENDING,
        decided_by: null,
        decided_at: null,
        decision_note: null,
      },
      create: { user_id: input.userId, program_id: input.programId },
      select: { status: true },
    });

    return { success: true as const, status: request.status };
  });
}

export async function approveFacultyAccessRequest(input: {
  requestUserId: string;
  decidedByUserId: string;
  note?: string | null;
}): Promise<FacultyAccessRequestOutcome> {
  return prisma.$transaction(async (tx) => {
    const request = await tx.facultyAccessRequest.findUnique({
      where: { user_id: input.requestUserId },
      select: {
        id: true,
        program_id: true,
        status: true,
        user: { select: { is_active: true } },
      },
    });
    if (!request) return { success: false as const, error: "Faculty request not found." };
    if (request.status === FacultyApprovalStatus.APPROVED) {
      return { success: true as const, status: FacultyApprovalStatus.APPROVED };
    }
    // A deactivated account must not be granted an affiliation: approval would
    // create scope the account cannot use, and reactivating is a separate
    // deliberate act.
    if (!request.user.is_active) {
      return {
        success: false as const,
        error: "This applicant's account is deactivated. Reactivate it before approving.",
      };
    }

    await tx.facultyAccessRequest.update({
      where: { id: request.id },
      data: {
        status: FacultyApprovalStatus.APPROVED,
        decided_by: input.decidedByUserId,
        decided_at: new Date(),
        decision_note: input.note ?? null,
      },
    });

    await tx.facultyProgramAffiliation.upsert({
      where: {
        faculty_id_program_id: { faculty_id: input.requestUserId, program_id: request.program_id },
      },
      update: { is_active: true, is_primary: true },
      create: {
        faculty_id: input.requestUserId,
        program_id: request.program_id,
        is_active: true,
        is_primary: true,
      },
    });

    await tx.userRole.upsert({
      where: { user_id_role: { user_id: input.requestUserId, role: SystemRole.FACULTY } },
      update: {},
      create: { user_id: input.requestUserId, role: SystemRole.FACULTY },
    });

    return { success: true as const, status: FacultyApprovalStatus.APPROVED };
  });
}

export async function rejectFacultyAccessRequest(input: {
  requestUserId: string;
  decidedByUserId: string;
  note?: string | null;
}): Promise<FacultyAccessRequestOutcome> {
  return prisma.$transaction(async (tx) => {
    const request = await tx.facultyAccessRequest.findUnique({
      where: { user_id: input.requestUserId },
      select: { id: true, program_id: true, status: true },
    });
    if (!request) return { success: false as const, error: "Faculty request not found." };

    await tx.facultyAccessRequest.update({
      where: { id: request.id },
      data: {
        status: FacultyApprovalStatus.REJECTED,
        decided_by: input.decidedByUserId,
        decided_at: new Date(),
        decision_note: input.note ?? null,
      },
    });

    // Revoke only what this self-request granted, and only if approval had
    // actually run. A PENDING request created no affiliation, and any other
    // affiliation on the account — Secretary-provisioned primary or
    // additional programs — predates the request and must survive untouched.
    // Revocation follows the domain convention: deactivate, never delete, so
    // the affiliation history stays on the account.
    if (request.status === FacultyApprovalStatus.APPROVED) {
      await tx.facultyProgramAffiliation.updateMany({
        where: { faculty_id: input.requestUserId, program_id: request.program_id, is_active: true },
        data: { is_active: false, is_primary: false },
      });
    }

    return { success: true as const, status: FacultyApprovalStatus.REJECTED };
  });
}
