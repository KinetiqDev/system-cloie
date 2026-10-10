"use server";

import { FacultyApprovalStatus } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";
import { facultyProfileSchema, type FacultyProfileInput } from "@/lib/schemas/faculty-profile";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { prisma } from "@/lib/db/prisma";
const ACADEMIC_DOMAIN_FAILURE = "An institutional ACD email is required for Faculty access.";

const NOT_GOOGLE_SESSION_FAILURE =
  "Faculty access requires your current ACD Google sign-in. Sign out and sign in with Google again.";

/**
 * Automatic Faculty registration onboarding. Creates the primary active program
 * affiliation immediately upon completing the onboarding form without requiring
 * Secretary approval.
 */
export async function createFacultyProfile(data: FacultyProfileInput) {
  try {
    // The centralized session boundary is the identity source: it covers real
    // Google sessions and the development, dedicated-demo, and CI test
    // sessions that Supabase alone does not describe. Every non-Google regime
    // is bounded by its own deployment gate.
    const authSession = await resolveAuthSession();
    if (!authSession) {
      return { success: false, error: "Authentication session invalid or missing." };
    }
    // Client-injected identity fields are stripped by Zod.
    const validatedData = facultyProfileSchema.parse(data);

    const domainUser = await prisma.user.findUnique({
      where: { id: authSession.userId },
      select: { id: true, auth_user_id: true, is_active: true },
    });

    if (!domainUser) {
      return {
        success: false,
        error: "Your account identity could not be resolved. Please sign out and sign in again.",
      };
    }

    if (!domainUser.is_active) {
      return { success: false, error: "Your System CLOIE account is currently inactive." };
    }

    // The session boundary already resolved this account from the verified
    // `auth_user_id` link, or from a deployment-bounded development,
    // dedicated-demo, or CI test identity. Re-comparing the link here would
    // only produce false negatives, and an unlinked account could never
    // produce a session in the first place.

    // Faculty is an internal role: refused unless this session is a proved
    // Google session on an ACD institutional address. The method was already
    // judged at the session boundary that produced this snapshot.
    if (authSession.authMethod !== "google") {
      return { success: false, error: NOT_GOOGLE_SESSION_FAILURE };
    }
    const email = (authSession.email ?? "").trim().toLowerCase();
    if (!email.endsWith("@acd.edu.ph") && !email.endsWith("@acdeducation.com")) {
      return { success: false, error: ACADEMIC_DOMAIN_FAILURE };
    }
    if (
      authSession.activeRole !== ROLES.FACULTY ||
      authSession.profileGate.status !== "FACULTY_ONBOARDING_REQUIRED"
    ) {
      return {
        success: false,
        error: "This session cannot complete Faculty onboarding. Sign in again and continue.",
      };
    }
    const program = await prisma.program.findUnique({
      where: { id: validatedData.program_id },
      select: { id: true, is_active: true },
    });

    if (!program) {
      return { success: false, error: "The selected program does not exist." };
    }

    if (!program.is_active) {
      return { success: false, error: "The selected program is archived or inactive." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.userRole.upsert({
        where: { user_id_role: { user_id: domainUser.id, role: ROLES.FACULTY } },
        update: {},
        create: { user_id: domainUser.id, role: ROLES.FACULTY },
      });

      await tx.facultyProgramAffiliation.upsert({
        where: {
          faculty_id_program_id: {
            faculty_id: domainUser.id,
            program_id: validatedData.program_id,
          },
        },
        update: { is_primary: true, is_active: true },
        create: {
          faculty_id: domainUser.id,
          program_id: validatedData.program_id,
          is_primary: true,
          is_active: true,
        },
      });

      const existingRequest = await tx.facultyAccessRequest.findUnique({
        where: { user_id: domainUser.id },
      });
      if (existingRequest) {
        await tx.facultyAccessRequest.update({
          where: { user_id: domainUser.id },
          data: { status: FacultyApprovalStatus.APPROVED },
        });
      }
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to request faculty access:", error);
    return {
      success: false,
      error: "An unexpected error occurred while processing your request.",
    };
  }
}
