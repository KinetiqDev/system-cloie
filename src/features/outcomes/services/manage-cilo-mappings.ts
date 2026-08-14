import { prisma } from "@/lib/db/prisma";
import type { ServiceResult } from "@/lib/utils/service-result";

export async function validateCiloMapping(ciloId: string, goId: string): Promise<ServiceResult> {
  const [cilo, go] = await Promise.all([
    prisma.cILO.findUnique({
      where: { id: ciloId },
      select: { is_active: true, course: { select: { course_scope: true, program_id: true } } },
    }),
    prisma.gO.findUnique({
      where: { id: goId },
      select: { id: true, is_active: true, program_id: true },
    }),
  ]);

  if (!cilo?.is_active || !go?.is_active)
    return { success: false, error: "Active CILO and Graduate Outcome are required" };
  if (cilo.course.course_scope === "GENERAL_EDUCATION")
    return {
      success: false,
      error: "General Education CILOs map only to Institutional Outcomes",
    };
  if (cilo.course.program_id !== go.program_id) {
    return {
      success: false,
      error: "Graduate Outcome must belong to the Course Academic Program",
    };
  }

  return { success: true, data: undefined };
}

export async function validateCiloInstitutionalOutcomeMapping(
  ciloId: string,
  institutionalOutcomeId: string
): Promise<ServiceResult> {
  const [cilo, institutionalOutcome] = await Promise.all([
    prisma.cILO.findUnique({
      where: { id: ciloId },
      select: { is_active: true, course: { select: { course_scope: true } } },
    }),
    prisma.institutionalOutcome.findUnique({
      where: { id: institutionalOutcomeId },
      select: { id: true, is_active: true },
    }),
  ]);

  if (!cilo?.is_active || !institutionalOutcome?.is_active)
    return { success: false, error: "Active CILO and Institutional Outcome are required" };
  if (cilo.course.course_scope !== "GENERAL_EDUCATION")
    return {
      success: false,
      error: "Institutional Outcomes map only General Education CILOs",
    };

  return { success: true, data: undefined };
}
