"use server";

import { EnrollmentSource, SystemRole } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  studentProfileSchema,
  deferredStudentProfileSchema,
  type StudentProfileInput,
  type DeferredStudentProfileInput,
} from "@/lib/schemas/student-profile";
import { getActiveTermId } from "@/features/academic-calendar/services/resolve-active-term";
import { upsertEnrollmentForActiveTerm } from "@/features/enrollments/services/manage-student-enrollments";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolveAuthenticatedDomainUser } from "@/features/auth/services/resolve-authenticated-domain-user";
import { redirect } from "next/navigation";

// Validation preserves the active-term and deferred-enrollment contract.
// fallow-ignore-next-line complexity
export async function registerStudentProfile(
  data: StudentProfileInput | DeferredStudentProfileInput
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return { error: "Authentication session invalid or missing." };
    }

    // Verify student email domain is authorized
    const studentEmail = user.email.trim().toLowerCase();
    const isAuthorized =
      studentEmail.endsWith("@acd.edu.ph") || studentEmail.endsWith("@acdeducation.com");
    if (!isAuthorized) {
      return { error: "Institutional email domain is required for student registration." };
    }

    // Resolve active term for enrollment (deferred if none exists)
    const activeTermId = await getActiveTermId();

    // Choose validation schema based on whether there is an active term.
    // If no active term exists, year_level and section are not yet known.
    // Client-injected identity fields (first_name/last_name/name) are stripped by Zod.
    const schema = activeTermId ? studentProfileSchema : deferredStudentProfileSchema;
    const validatedData = schema.parse(data);

    // Verify program exists and is active
    const program = await prisma.program.findUnique({
      where: { id: validatedData.program_id },
    });
    if (!program) {
      return { error: "The selected program does not exist." };
    }
    if (!program.is_active) {
      return { error: "The selected program is archived or inactive." };
    }

    // Verify major exists, is active, and belongs to program
    if (validatedData.major_id) {
      const major = await prisma.major.findUnique({
        where: { id: validatedData.major_id },
      });
      if (!major) {
        return { error: "The selected major does not exist." };
      }
      if (!major.is_active) {
        return { error: "The selected major is archived or inactive." };
      }
      if (major.program_id !== validatedData.program_id) {
        return { error: "The selected major does not belong to the selected program." };
      }
    }

    const domainUser = await resolveAuthenticatedDomainUser({
      authUserId: user.id,
      email: user.email,
    });

    if (!domainUser) {
      return {
        error:
          "Your account identity could not be resolved. Please sign out and sign in with Google again.",
      };
    }

    if (!domainUser.name.trim()) {
      return {
        error: "Your account name is not available. Please sign out and sign in with Google again.",
      };
    }

    // Preserve account-state gates (profileGate INACTIVE) on direct Server Action calls.
    if (!domainUser.is_active) {
      return { error: "Your CLOIE account is currently inactive." };
    }

    const domainUserId = domainUser.id;

    // Role + academic profile only. Never create a User and never write client identity.
    await prisma.$transaction(async (tx) => {
      const existingRole = await tx.userRole.findUnique({
        where: { user_id_role: { user_id: domainUserId, role: ROLES.STUDENT } },
      });
      if (!existingRole) {
        await tx.userRole.create({
          data: {
            user_id: domainUserId,
            role: ROLES.STUDENT,
          },
        });
      }

      // Phase 9: Profile only holds static cohort fields - enrollment data is in StudentEnrollment
      await tx.studentAcademicProfile.upsert({
        where: { user_id: domainUserId },
        update: {
          program_id: validatedData.program_id,
          major_id: validatedData.major_id || null,
        },
        create: {
          user_id: domainUserId,
          program_id: validatedData.program_id,
          major_id: validatedData.major_id || null,
        },
      });
    });

    // Create enrollment for active term (separate transaction) if active term exists.
    // When activeTermId is set we used studentProfileSchema which requires year_level and section.
    if (activeTermId) {
      const fullData = validatedData as StudentProfileInput;
      const enrollmentResult = await upsertEnrollmentForActiveTerm({
        studentUserId: domainUserId,
        termInstanceId: activeTermId,
        programId: fullData.program_id,
        majorId: fullData.major_id || null,
        yearLevel: fullData.year_level,
        section: fullData.section || null,
        source: EnrollmentSource.ONBOARDING,
      });

      if (!enrollmentResult.success) {
        console.error("Failed to create enrollment:", enrollmentResult.error);
        return { success: false, error: enrollmentResult.error };
      }
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to register student profile:", error);
    if (error instanceof Error && error.message.startsWith("ROLE_MISMATCH")) {
      return { success: false, error: "Your account is already registered with a different role." };
    }
    return {
      success: false,
      error: "An unexpected error occurred while processing your request.",
    };
  }
}

function parseAbandonedRole(value: unknown): SystemRole | null {
  return typeof value === "string" && (Object.values(SystemRole) as string[]).includes(value)
    ? (value as SystemRole)
    : null;
}

/**
 * Whether the given role claim has no completed profile artifact yet, so
 * abandoning it is a safe delete. Roles without an onboarding flow are never
 * abandoned through this path.
 */
async function isRoleClaimIncomplete(userId: string, role: SystemRole): Promise<boolean> {
  switch (role) {
    case ROLES.STUDENT:
      return (
        (await prisma.studentAcademicProfile.findUnique({
          where: { user_id: userId },
          select: { id: true },
        })) === null
      );
    case ROLES.FACULTY:
      return (
        (await prisma.facultyProgramAffiliation.findFirst({
          where: { faculty_id: userId, is_active: true },
          select: { id: true },
        })) === null
      );
    case ROLES.ALUMNI:
      return (
        (await prisma.alumniProfile.findUnique({
          where: { user_id: userId },
          select: { id: true },
        })) === null
      );
    case ROLES.INDUSTRY_PARTNER:
      return (
        (await prisma.industryPartnerProfile.findUnique({
          where: { user_id: userId },
          select: { id: true },
        })) === null
      );
    default:
      return false;
  }
}

export async function resetIncompleteRoleClaim(abandoned?: string | FormData) {
  const session = await resolveAuthSession();

  // The role being abandoned travels with the request (hidden form field or
  // direct caller argument) instead of the active-role cookie alone: a stale
  // or expired cookie resolves to a complete role and must not redirect the
  // deletion at the wrong role or skip it while the incomplete claim remains
  // selectable.
  const requested =
    typeof abandoned === "string"
      ? parseAbandonedRole(abandoned)
      : parseAbandonedRole(abandoned?.get("role"));
  const target =
    requested && session?.roles.includes(requested) ? requested : (session?.activeRole ?? null);

  if (session && target && session.roles.includes(target)) {
    const incomplete =
      target === session.activeRole
        ? session.profileGate.status !== "COMPLETE"
        : await isRoleClaimIncomplete(session.userId, target);
    if (incomplete) {
      await prisma.userRole.delete({
        where: { user_id_role: { user_id: session.userId, role: target } },
      });
    }
  }

  // Route back to the portal matching the role being onboarded:
  // staff roles (faculty) → /portal/staff; respondent roles → /portal/respondents.
  const isStaffClaim =
    target === ROLES.FACULTY ||
    (session && "intent" in session.profileGate && session.profileGate.intent === "faculty");

  redirect(isStaffClaim ? "/portal/staff" : "/portal/respondents");
}
