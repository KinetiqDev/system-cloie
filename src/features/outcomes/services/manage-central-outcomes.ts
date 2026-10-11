import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { isCollegeOversightRole } from "@/lib/constants/college-oversight";
import { prisma } from "@/lib/db/prisma";

/**
 * The college-wide outcome catalog behind the Dean and Secretary Learning
 * Outcomes page: the shared Common PO catalog, the read-only ILO catalog, and
 * every PO of every active program across all classifications. Only Common
 * POs, program Common/Institution-specific POs, and legacy UNCLASSIFIED rows
 * are writable by these roles; the write boundary enforces that separately.
 */
export async function readCentralOutcomeAdministration() {
  const session = await resolveAuthSession();
  if (!session || !isCollegeOversightRole(session.activeRole))
    return { success: false, error: "You cannot manage central outcomes." } as const;
  const [common, institutional, programs] = await Promise.all([
    prisma.commonProgramOutcome.findMany({
      include: { _count: { select: { program_pos: true, ge_mappings: true } } },
      orderBy: [{ order: "asc" }, { code: "asc" }, { id: "asc" }],
    }),
    prisma.institutionalOutcome.findMany({
      select: { id: true, code: true, description: true, is_active: true },
      orderBy: [{ order: "asc" }, { code: "asc" }],
    }),
    prisma.program.findMany({
      where: { is_active: true },
      select: {
        id: true,
        code: true,
        name: true,
        pos: {
          orderBy: [{ order: "asc" }, { code: "asc" }],
          select: {
            id: true,
            code: true,
            description: true,
            classification: true,
            common_outcome_id: true,
            is_active: true,
            _count: { select: { cilo_mappings: true } },
          },
        },
      },
      orderBy: { code: "asc" },
    }),
  ]);
  return { success: true, data: { common, institutional, programs } } as const;
}

export type CentralOutcomeAdministration = Extract<
  Awaited<ReturnType<typeof readCentralOutcomeAdministration>>,
  { success: true }
>["data"];
