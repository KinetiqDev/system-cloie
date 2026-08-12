"use server";

import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { createClient } from "@/lib/supabase/server";
import { alumniProfileSchema, type AlumniProfileInput } from "@/lib/schemas/alumni-profile";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";
import { resolveAuthenticatedDomainUser } from "@/features/auth/services/resolve-authenticated-domain-user";

export async function createAlumniProfile(data: AlumniProfileInput) {
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
    const validatedData = alumniProfileSchema.parse(data);

    // Verify program exists and is active
    const program = await prisma.program.findUnique({
      where: { id: validatedData.program_id },
    });

    if (!program) {
      return { success: false, error: "The selected program does not exist." };
    }

    if (!program.is_active) {
      return { success: false, error: "The selected program is archived or inactive." };
    }

    // Verify major exists, is active, and belongs to program
    if (validatedData.major_id) {
      const major = await prisma.major.findUnique({
        where: { id: validatedData.major_id },
      });

      if (!major) {
        return { success: false, error: "The selected major does not exist." };
      }

      if (!major.is_active) {
        return { success: false, error: "The selected major is archived or inactive." };
      }

      if (major.program_id !== validatedData.program_id) {
        return { success: false, error: "The selected major does not belong to the selected program." };
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
    if (domainUser.alumni_profile?.verification_status === "REJECTED") {
      return { success: false, error: "Your registration application was not approved." };
    }

    // Role + alumni profile only. Never create a User and never write client identity.
    await prisma.$transaction(async (tx) => {
      const existingRole = await tx.userRole.findUnique({
        where: { user_id: domainUser.id },
      });
      if (existingRole && existingRole.role !== ROLES.ALUMNI) {
        throw new Error("ROLE_MISMATCH_NON_ALUMNI");
      }
      if (!existingRole) {
        await tx.userRole.create({
          data: {
            user_id: domainUser.id,
            role: ROLES.ALUMNI,
          },
        });
      }

      await tx.alumniProfile.upsert({
        where: { user_id: domainUser.id },
        update: {
          graduation_year: validatedData.graduation_year,
          program_id: validatedData.program_id,
          major_id: validatedData.major_id || null,
        },
        create: {
          user_id: domainUser.id,
          graduation_year: validatedData.graduation_year,
          program_id: validatedData.program_id,
          major_id: validatedData.major_id || null,
        },
      });
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to create alumni profile:", error);
    if (error instanceof Error && error.message.startsWith("ROLE_MISMATCH")) {
      return { success: false, error: "Your account is already registered with a different role." };
    }
    // Handle Prisma unique constraint violation (e.g., role or profile already exists)
    if (isUniqueConstraintError(error)) {
      return { success: false, error: "You already have an alumni profile." };
    }
    return {
      success: false,
      error: "An unexpected error occurred while processing your request.",
    };
  }
}
