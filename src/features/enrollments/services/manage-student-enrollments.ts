import { prisma } from "@/lib/db/prisma";
import type { EnrollmentResult, UpsertEnrollmentInput } from "../types";

/**
 * Upsert enrollment for the active term (used by onboarding).
 */
export async function upsertEnrollmentForActiveTerm(
  input: UpsertEnrollmentInput
): Promise<EnrollmentResult<{ id: string; isNew: boolean }>> {
  const result = await prisma.$transaction(async (tx) => {
    // Check if enrollment already exists for this student/term
    const existing = await tx.studentEnrollment.findUnique({
      where: {
        student_user_id_term_instance_id: {
          student_user_id: input.studentUserId,
          term_instance_id: input.termInstanceId,
        },
      },
    });

    if (existing) {
      // Update existing enrollment
      const updated = await tx.studentEnrollment.update({
        where: { id: existing.id },
        data: {
          program_id: input.programId,
          major_id: input.majorId ?? null,
          year_level: input.yearLevel,
          section: input.section ?? null,
          source: input.source,
          is_active: true,
        },
      });
      return { id: updated.id, isNew: false };
    }

    // Create new enrollment
    const created = await tx.studentEnrollment.create({
      data: {
        student_user_id: input.studentUserId,
        term_instance_id: input.termInstanceId,
        program_id: input.programId,
        major_id: input.majorId ?? null,
        year_level: input.yearLevel,
        section: input.section ?? null,
        source: input.source,
        is_active: true,
      },
    });

    return { id: created.id, isNew: true };
  });

  return { success: true, data: result };
}
