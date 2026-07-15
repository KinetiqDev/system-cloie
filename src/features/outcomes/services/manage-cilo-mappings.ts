import { prisma } from "@/lib/db/prisma";
import type { ServiceResult } from "@/lib/utils/service-result";

export async function validateCiloMapping(ciloId: string, goId: string): Promise<ServiceResult> {
  const [cilo, go] = await Promise.all([
    prisma.cILO.findUnique({
      where: { id: ciloId },
      select: { is_active: true, course: { select: { course_scope: true, program_id: true } } },
    }),
    prisma.gO.findUnique({ where: { id: goId }, select: { id: true, is_active: true, program_id: true } }),
  ]);

  if (!cilo?.is_active || !go?.is_active) return { success: false, error: "Active CILO and Graduate Outcome are required" };
  if (cilo.course.course_scope === "PROGRAM_SPECIFIC" && cilo.course.program_id !== go.program_id) {
    return { success: false, error: "Graduate Outcome must belong to the Course Academic Program" };
  }

  return { success: true, data: undefined };
}
