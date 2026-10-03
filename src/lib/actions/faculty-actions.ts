"use server";

import { prisma } from "@/lib/db/prisma";
import { facultyProfileSchema, type FacultyProfileInput } from "@/lib/schemas/faculty-profile";
import { createFacultyAccessRequest } from "@/features/users/services/manage-faculty-access-requests";
import { requireLegalAcknowledgement } from "@/features/legal/services/require-legal-acknowledgement";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";

const ACADEMIC_DOMAIN_FAILURE = "An institutional ACD email is required for Faculty access.";

const NOT_GOOGLE_SESSION_FAILURE =
  "Faculty access requires your current ACD Google sign-in. Sign out and sign in with Google again.";

/**
 * Explicit Faculty registration. The request is self-submitted but not
 * self-authorized (issue #649): it creates a PENDING review row and no
 * program affiliation, so the Faculty workspace stays closed until a
 * Secretary approves. Legal acknowledgement is enforced server-side before
 * any identity or role write, and Faculty is an internal role, so only a
 * current Google sign-in may request it.
 */
export async function requestFacultyAccess(data: FacultyProfileInput) {
  try {
    const legal = await requireLegalAcknowledgement("faculty");
    if (!legal.acknowledged) {
      return { success: false, error: "A current legal acknowledgement is required." };
    }
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

    const result = await createFacultyAccessRequest({
      userId: domainUser.id,
      programId: validatedData.program_id,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to request faculty access:", error);
    return {
      success: false,
      error: "An unexpected error occurred while processing your request.",
    };
  }
}
