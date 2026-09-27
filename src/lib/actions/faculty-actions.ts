"use server";

import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { createClient } from "@/lib/supabase/server";
import { facultyProfileSchema, type FacultyProfileInput } from "@/lib/schemas/faculty-profile";
import { resolveAuthenticatedDomainUser } from "@/features/auth/services/resolve-authenticated-domain-user";
import { requestFacultyAccess as submitFacultyAccessRequest } from "@/features/users/services/manage-faculty-access-requests";
import { requireLegalAcknowledgement } from "@/features/legal/services/require-legal-acknowledgement";
import { resolveSessionAuthMethod } from "@/features/auth/services/resolve-auth-method";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";

const ACADEMIC_DOMAIN_FAILURE =
  "An institutional ACD email is required for Faculty access.";

const NOT_GOOGLE_SESSION_FAILURE =
  "Faculty access requires your current ACD Google sign-in. Sign out and sign in with Google again.";

/**
 * Faculty is an internal role, so both the direct profile action and the
 * registration request require a current Google session and an ACD
 * institutional email. The method is proved from verified access-token claims,
 * never from client state, so a password, one-time-code, or recovery session
 * cannot mutate Faculty scope even when the account is already linked.
 */
async function requireGoogleFacultySession(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string | null }
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const method = await resolveSessionAuthMethod(() => supabase.auth.getClaims());
  if (method !== "google") {
    return { ok: false, error: NOT_GOOGLE_SESSION_FAILURE };
  }

  const email = (user.email ?? "").trim().toLowerCase();
  if (!email.endsWith("@acd.edu.ph") && !email.endsWith("@acdeducation.com")) {
    return { ok: false, error: ACADEMIC_DOMAIN_FAILURE };
  }

  return { ok: true, email };
}

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
      return { success: false, error: "Your CLOIE account is currently inactive." };
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

    const result = await submitFacultyAccessRequest({
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

export async function createFacultyProfile(data: FacultyProfileInput) {
  try {
    // The centralized session boundary is the identity source, so this action
    // works for a real Google session and for the deployment-bounded
    // development, dedicated-demo, and CI test sessions.
    const authSession = await resolveAuthSession();
    if (!authSession) {
      return { success: false, error: "Authentication session invalid or missing." };
    }

    // Client-injected identity fields are stripped by Zod.
    const validatedData = facultyProfileSchema.parse(data);

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

    const domainUser = await prisma.user.findUnique({
      where: { id: authSession.userId },
      select: { id: true, name: true, auth_user_id: true, is_active: true },
    });

    if (!domainUser) {
      return {
        success: false,
        error:
          "Your account identity could not be resolved. Please sign out and sign in with Google again.",
      };
    }

    // The session boundary already resolved this account from the verified
    // `auth_user_id` link (or a deployment-bounded fixture identity), so an
    // unlinked account cannot reach this write at all.

    // A password, one-time-code, or recovery session must not mutate Faculty
    // scope even when the account is already linked, so the direct action
    // requires the same current Google session and ACD email as the request.
    if (authSession.authMethod !== "google") {
      return { success: false, error: NOT_GOOGLE_SESSION_FAILURE };
    }
    const sessionEmail = (authSession.email ?? "").trim().toLowerCase();
    if (!sessionEmail.endsWith("@acd.edu.ph") && !sessionEmail.endsWith("@acdeducation.com")) {
      return { success: false, error: ACADEMIC_DOMAIN_FAILURE };
    }

    if (!domainUser.name.trim()) {
      return {
        success: false,
        error: "Your account name is not available. Please sign out and sign in with Google again.",
      };
    }

    // Preserve account-state gates (profileGate INACTIVE) on direct Server Action calls.
    if (!domainUser.is_active) {
      return { success: false, error: "Your CLOIE account is currently inactive." };
    }

    // A pending or rejected self-request never grants an affiliation here: the
    // Secretary approval service is the only writer of the active affiliation
    // for a self-requested Faculty account.
    const request = await prisma.facultyAccessRequest.findUnique({
      where: { user_id: domainUser.id },
      select: { status: true },
    });
    if (request && request.status !== "APPROVED") {
      return {
        success: false,
        error:
          request.status === "REJECTED"
            ? "Your Faculty request was not approved. You may submit a new request."
            : "Your Faculty request is still awaiting institutional review.",
      };
    }

    // No request row and no active affiliation means a self-service claimant
    // who never filed through Faculty registration: file the request with the
    // submitted program instead of granting access, so Faculty access still
    // begins only after Secretary approval.
    const existingAffiliation = await prisma.facultyProgramAffiliation.findFirst({
      where: { faculty_id: domainUser.id, is_active: true },
      select: { id: true },
    });
    if (!request && !existingAffiliation) {
      const filed = await submitFacultyAccessRequest({
        userId: domainUser.id,
        programId: validatedData.program_id,
      });
      if (!filed.success) {
        return { success: false, error: filed.error };
      }
      return {
        success: false,
        error:
          "Your Faculty request has been submitted for institutional review. You will gain access after approval.",
      };
    }

    // Role + affiliation only. Never create a User and never write client identity.
    await prisma.$transaction(async (tx) => {
      const existingRole = await tx.userRole.findUnique({
        where: { user_id_role: { user_id: domainUser.id, role: ROLES.FACULTY } },
      });
      if (!existingRole) {
        await tx.userRole.create({
          data: {
            user_id: domainUser.id,
            role: ROLES.FACULTY,
          },
        });
      }

      await tx.facultyProgramAffiliation.upsert({
        where: {
          faculty_id_program_id: {
            faculty_id: domainUser.id,
            program_id: validatedData.program_id,
          },
        },
        update: {
          is_primary: true,
          is_active: true,
        },
        create: {
          faculty_id: domainUser.id,
          program_id: validatedData.program_id,
          is_primary: true,
          is_active: true,
        },
      });
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to create faculty profile:", error);
    if (error instanceof Error && error.message.startsWith("ROLE_MISMATCH")) {
      return { success: false, error: "Your account is already registered with a different role." };
    }
    return {
      success: false,
      error: "An unexpected error occurred while processing your request.",
    };
  }
}
