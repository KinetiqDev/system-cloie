import { ROLES, type Role } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";

type ResolveReviewerProgramScopeInput = {
  programId?: string;
  reviewerId: string;
  reviewerRole: Role;
};

function toUniqueProgramIds(rows: Array<{ program_id: string }>) {
  return [...new Set(rows.map((row) => row.program_id))];
}

export async function resolveReviewerProgramScope({
  programId,
  reviewerId,
  reviewerRole,
}: ResolveReviewerProgramScopeInput): Promise<string[] | null> {
  if (reviewerRole === ROLES.DEAN) {
    return null;
  }

  if (reviewerRole === ROLES.FACULTY) {
    const rows = await prisma.facultyProgramAffiliation.findMany({
      where: { faculty_id: reviewerId, is_active: true },
      select: { program_id: true },
    });

    return toUniqueProgramIds(rows);
  }

  if (reviewerRole === ROLES.PROGRAM_HEAD) {
    if (programId) {
      const assignments = await prisma.programHeadAssignment.findMany({
        where: { program_head_id: reviewerId, program_id: programId, is_active: true },
        select: { program_id: true },
      });

      return assignments.length > 0 ? [programId] : [];
    }

    const rows = await prisma.programHeadAssignment.findMany({
      where: { program_head_id: reviewerId, is_active: true },
      select: { program_id: true },
    });

    return toUniqueProgramIds(rows);
  }

  return [];
}
