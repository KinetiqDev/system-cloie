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

    // Verify program exists and is active (if provided)
    if (validatedData.program_id) {
      const program = await prisma.program.findUnique({
        where: { id: validatedData.program_id },
      });

      if (!program) {
        return { success: false, error: "The selected program does not exist." };
      }

      if (!program.is_active) {
        return { success: false, error: "The selected program is archived or inactive." };
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
    // Matches profileGate INACTIVE / REJECTED_EXTERNAL_ACCOUNT.
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

      await tx.industryPartnerProfile.upsert({
        where: { user_id: domainUser.id },
        update: {
          company_name: validatedData.company_name,
          position: validatedData.position || null,
          program_id: validatedData.program_id || null,
        },
        create: {
          user_id: domainUser.id,
          company_name: validatedData.company_name,
          position: validatedData.position || null,
          program_id: validatedData.program_id || null,
        },
      });
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
