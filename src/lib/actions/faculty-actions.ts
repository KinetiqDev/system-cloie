"use server";

import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { createClient } from "@/lib/supabase/server";
import { facultyProfileSchema, type FacultyProfileInput } from "@/lib/schemas/faculty-profile";
import { resolveAuthenticatedDomainUser } from "@/features/auth/services/resolve-authenticated-domain-user";
import { requestFacultyAccess as submitFacultyAccessRequest } from "@/features/users/services/manage-faculty-access-requests";
import { requireLegalAcknowledgement } from "@/features/legal/services/require-legal-acknowledgement";

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

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return { success: false, error: "Authentication session invalid or missing." };
    }

    // Client-injected identity fields are stripped by Zod.
    const validatedData = facultyProfileSchema.parse(data);

    const domainUser = await resolveAuthenticatedDomainUser({
      authUserId: user.id,
      email: user.email,
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
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
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

    const domainUser = await resolveAuthenticatedDomainUser({
      authUserId: user.id,
      email: user.email,
    });

    if (!domainUser) {
      return {
        success: false,
        error:
          "Your account identity could not be resolved. Please sign out and sign in with Google again.",
      };
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
