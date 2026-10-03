"use server";

import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import {
  industryPartnerProfileSchema,
  type IndustryPartnerProfileInput,
} from "@/lib/schemas/industry-partner-profile";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";

function resolveProgramIds(data: IndustryPartnerProfileInput): string[] {
  if (Array.isArray(data.program_ids) && data.program_ids.length > 0) {
    return data.program_ids as string[];
  }
  if (data.program_id) return [data.program_id as string];
  return [];
}

async function verifyProgramsExistAndActive(
  programIds: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (programIds.length === 0) return { ok: true };
  const programs = await prisma.program.findMany({
    where: { id: { in: programIds } },
    select: { id: true, is_active: true },
  });
  const byId = new Map(programs.map((p) => [p.id, p] as const));
  for (const pid of programIds) {
    const prog = byId.get(pid);
    if (!prog) {
      return {
        ok: false,
        error:
          programIds.length === 1
            ? "The selected program does not exist."
            : "One of the selected programs does not exist.",
      };
    }
    if (!prog.is_active) {
      return {
        ok: false,
        error:
          programIds.length === 1
            ? "The selected program is archived or inactive."
            : "One of the selected programs is archived or inactive.",
      };
    }
  }
  return { ok: true };
}

export async function createIndustryPartnerProfile(data: IndustryPartnerProfileInput) {
  try {
    // The centralized session boundary is the identity and readiness source: it
    // verifies the access-token claims, so a raw one-time-code or recovery
    // session — which carries no workspace authority — can never reach this
    // write (issue #649).
    const authSession = await resolveAuthSession();
    if (!authSession) {
      return { success: false, error: "Authentication session invalid or missing." };
    }

    // The account-state and institutional-review verdicts speak first, so an
    // inactive or rejected account learns exactly why.
    if (authSession.profileGate.status === "INACTIVE") {
      return { success: false, error: "Your System CLOIE account is currently inactive." };
    }
    if (authSession.profileGate.status === "REJECTED_EXTERNAL_ACCOUNT") {
      return { success: false, error: "Your registration application was not approved." };
    }

    // Industry Partner is chosen during registration, so this action only
    // completes the profile of the workspace the session is actually in:
    // Industry Partner must be the selected active role and must be waiting for
    // exactly this onboarding step. A withheld role, another role's pending
    // gate, or a raw code session grants nothing here.
    if (
      authSession.activeRole !== ROLES.INDUSTRY_PARTNER ||
      authSession.profileGate.status !== "INDUSTRY_PARTNER_ONBOARDING_REQUIRED"
    ) {
      return {
        success: false,
        error:
          "This session cannot complete Industry Partner onboarding. Sign in again and continue.",
      };
    }

    // Client-injected identity fields are stripped by Zod.
    const validatedData = industryPartnerProfileSchema.parse(data);
    const programIds = resolveProgramIds(validatedData);

    // Verify each program exists and is active
    const verification = await verifyProgramsExistAndActive(programIds);
    if (!verification.ok) {
      return { success: false, error: verification.error };
    }

    // Profile only: the role was assigned during verified registration, so no
    // user, role, or identity field is written here.
    await prisma.$transaction(async (tx) => {
      const legacyProgramId = programIds[0] ?? null;
      await tx.industryPartnerProfile.upsert({
        where: { user_id: authSession.userId },
        update: {
          company_name: validatedData.company_name,
          position: validatedData.position || null,
          program_id: legacyProgramId,
        },
        create: {
          user_id: authSession.userId,
          company_name: validatedData.company_name,
          position: validatedData.position || null,
          program_id: legacyProgramId,
        },
      });
      // Sync multi-affiliation join table
      await tx.industryPartnerProgramAffiliation.deleteMany({
        where: { industry_partner_id: authSession.userId },
      });
      if (programIds.length > 0) {
        await tx.industryPartnerProgramAffiliation.createMany({
          data: programIds.map((program_id) => ({
            industry_partner_id: authSession.userId,
            program_id,
          })),
          skipDuplicates: true,
        });
      }
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to create industry partner profile:", error);
    return {
      success: false,
      error: "An unexpected error occurred while processing your request.",
    };
  }
}
