"use server";

import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { createClient } from "@/lib/supabase/server";
import { industryPartnerProfileSchema, type IndustryPartnerProfileInput } from "@/lib/schemas/industry-partner-profile";
import { resolveAuthenticatedDomainUser } from "@/features/auth/services/resolve-authenticated-domain-user";

export async function createIndustryPartnerProfile(data: IndustryPartnerProfileInput) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return { success: false, error: "Authentication session invalid or missing." };
    }

    // Client-injected identity fields are stripped by Zod.
    const validatedData = industryPartnerProfileSchema.parse(data);
    const programIds: string[] = (() => {
      if (Array.isArray(validatedData.program_ids) && validatedData.program_ids.length > 0) {
        return validatedData.program_ids as string[];
      }
      if (validatedData.program_id) return [validatedData.program_id as string];
      return [];
    })();

    // Verify each program exists and is active
    if (programIds.length > 0) {
      const programs = await prisma.program.findMany({
        where: { id: { in: programIds } },
        select: { id: true, is_active: true },
      });
      const byId = new Map(programs.map((p) => [p.id, p] as const));
      for (const pid of programIds) {
        const prog = byId.get(pid);
        if (!prog) {
          return { success: false, error: programIds.length === 1 ? "The selected program does not exist." : "One of the selected programs does not exist." };
        }
        if (!prog.is_active) {
          return { success: false, error: programIds.length === 1 ? "The selected program is archived or inactive." : "One of the selected programs is archived or inactive." };
        }
      }
    }

    const domainUser = await resolveAuthenticatedDomainUser({
      authUserId: user.id,
      email: user.email,
    });

    if (!domainUser) {
      return {
        success: false,
        error: "Your account identity could not be resolved. Please sign out and sign in with Google again.",
      };
    }

    if (!domainUser.name.trim()) {
      return {
        success: false,
        error: "Your account name is not available. Please sign out and sign in with Google again.",
      };
    }

    // Preserve account-state and external verification gates on direct Server Action calls.
    if (!domainUser.is_active) {
      return { success: false, error: "Your CLOIE account is currently inactive." };
    }
    if (domainUser.industry_partner_profile?.verification_status === "REJECTED") {
      return { success: false, error: "Your registration application was not approved." };
    }

    // Role + industry partner profile only. Never create a User and never write client identity.
    await prisma.$transaction(async (tx) => {
      const existingRole = await tx.userRole.findUnique({
        where: { user_id: domainUser.id },
      });
      if (existingRole && existingRole.role !== ROLES.INDUSTRY_PARTNER) {
        throw new Error("ROLE_MISMATCH_NON_INDUSTRY_PARTNER");
      }
      if (!existingRole) {
        await tx.userRole.create({
          data: {
            user_id: domainUser.id,
            role: ROLES.INDUSTRY_PARTNER,
          },
        });
      }

      const legacyProgramId = programIds[0] ?? null;
      await tx.industryPartnerProfile.upsert({
        where: { user_id: domainUser.id },
        update: {
          company_name: validatedData.company_name,
          position: validatedData.position || null,
          program_id: legacyProgramId,
        },
        create: {
          user_id: domainUser.id,
          company_name: validatedData.company_name,
          position: validatedData.position || null,
          program_id: legacyProgramId,
        },
      });
      // Sync multi-affiliation join table
      await tx.industryPartnerProgramAffiliation.deleteMany({
        where: { industry_partner_id: domainUser.id },
      });
      if (programIds.length > 0) {
        await tx.industryPartnerProgramAffiliation.createMany({
          data: programIds.map((program_id) => ({
            industry_partner_id: domainUser.id,
            program_id,
          })),
          skipDuplicates: true,
        });
      }
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to create industry partner profile:", error);
    if (error instanceof Error && error.message.startsWith("ROLE_MISMATCH")) {
      return { success: false, error: "Your account is already registered with a different role." };
    }
    return {
      success: false,
      error: "An unexpected error occurred while processing your request.",
    };
  }
}
