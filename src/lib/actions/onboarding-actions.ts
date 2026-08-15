"use server";

import { EnrollmentSource } from "@prisma/client";
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
export async function registerStudentProfile(data: StudentProfileInput | DeferredStudentProfileInput) {
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
      studentEmail.endsWith("@acd.edu.ph") ||
      studentEmail.endsWith("@acdeducation.com");
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
        error: "Your account identity could not be resolved. Please sign out and sign in with Google again.",
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
        where: { user_id: domainUserId },
      });
      if (existingRole && existingRole.role !== ROLES.STUDENT) {
        throw new Error("ROLE_MISMATCH_NON_STUDENT");
      }
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

export async function resetIncompleteRoleClaim() {
  const session = await resolveAuthSession();

  if (session && session.profileGate.status !== "COMPLETE") {
    await prisma.userRole.deleteMany({
      where: { user_id: session.userId },
    });
  }

  redirect("/portal/respondents");
}
