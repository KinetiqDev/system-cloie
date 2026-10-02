"use server";

import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { alumniProfileSchema, type AlumniProfileInput } from "@/lib/schemas/alumni-profile";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";

export async function createAlumniProfile(data: AlumniProfileInput) {
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

    // Alumni is chosen during registration, so this action only completes the
    // profile of the workspace the session is actually in: Alumni must be the
    // selected active role and must be waiting for exactly this onboarding
    // step. A withheld role, another role's pending gate, or a raw code session
    // grants nothing here.
    if (
      authSession.activeRole !== ROLES.ALUMNI ||
      authSession.profileGate.status !== "ALUMNI_ONBOARDING_REQUIRED"
    ) {
      return {
        success: false,
        error: "This session cannot complete Alumni onboarding. Sign in again and continue.",
      };
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
        return {
          success: false,
          error: "The selected major does not belong to the selected program.",
        };
      }
    }

    // Profile only: the role was assigned during verified registration, so no
    // user, role, or identity field is written here.
    await prisma.alumniProfile.upsert({
      where: { user_id: authSession.userId },
      update: {
        graduation_year: validatedData.graduation_year,
        program_id: validatedData.program_id,
        major_id: validatedData.major_id || null,
      },
      create: {
        user_id: authSession.userId,
        graduation_year: validatedData.graduation_year,
        program_id: validatedData.program_id,
        major_id: validatedData.major_id || null,
      },
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to create alumni profile:", error);
    // A Prisma unique constraint violation means the profile already exists.
    if (isUniqueConstraintError(error)) {
      return { success: false, error: "You already have an alumni profile." };
    }
    return {
      success: false,
      error: "An unexpected error occurred while processing your request.",
    };
  }
}
