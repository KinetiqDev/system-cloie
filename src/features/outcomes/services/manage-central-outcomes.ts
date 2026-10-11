import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { prisma } from "@/lib/db/prisma";
import { ROLES } from "@/lib/constants/roles";

export async function readCentralOutcomeAdministration() {
  const session = await resolveAuthSession();
  if (!session || (session.activeRole !== ROLES.SECRETARY && session.activeRole !== ROLES.DEAN))
    return { success: false, error: "You cannot manage central outcomes." } as const;
  const [common, programs] = await Promise.all([
    prisma.commonProgramOutcome.findMany({
      include: { _count: { select: { program_pos: true, ge_mappings: true } } },
      orderBy: [{ order: "asc" }, { code: "asc" }, { id: "asc" }],
    }),
    prisma.program.findMany({
      where: { is_active: true },
      select: {
        id: true,
        code: true,
        name: true,
        pos: {
          // UNCLASSIFIED legacy rows are listed so Secretary/Dean can see and
          // claim them; they can never be filtered out of every manager's view.
          where: {
            classification: { in: ["COMMON", "INSTITUTION_SPECIFIC", "UNCLASSIFIED"] as const },
          },
          orderBy: [{ order: "asc" }, { code: "asc" }],
          select: {
            id: true,
            code: true,
            description: true,
            classification: true,
            common_outcome_id: true,
            is_active: true,
          },
        },
      },
      orderBy: { code: "asc" },
    }),
  ]);
  return { success: true, data: { common, programs } } as const;
}

export type CentralOutcomeAdministration = Extract<
  Awaited<ReturnType<typeof readCentralOutcomeAdministration>>,
  { success: true }
>["data"];
