"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/constants/roles";
import {
  ACTIVE_ROLE_COOKIE_MAX_AGE_SECONDS,
  ACTIVE_ROLE_COOKIE_NAME,
} from "@/features/auth/services/active-role-cookie";
import { buildAuthSessionSnapshot } from "@/features/auth/services/build-auth-session-snapshot";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";
import { getActiveTermId } from "@/features/academic-calendar/services/resolve-active-term";
import { prisma } from "@/lib/db/prisma";

/**
 * Switch the caller's active role context. The requested role MUST already
 * belong to the caller's session — otherwise the switch is rejected.
 * Persists the choice in the `cloie_active_role` cookie, then navigates to
 * the dashboard for the newly activated role.
 */

async function resolveSelectedRoleReadiness(userId: string, role: Role) {
  if (role === "STUDENT") {
    const activeTermId = await getActiveTermId();
    if (!activeTermId) return { hasActiveEnrollment: false };
    const enrollment = await prisma.studentEnrollment.findUnique({
      where: {
        student_user_id_term_instance_id: {
          student_user_id: userId,
          term_instance_id: activeTermId,
        },
      },
      select: { is_active: true },
    });
    return { hasActiveEnrollment: enrollment?.is_active === true };
  }

  if (role === "FACULTY") {
    const affiliation = await prisma.facultyProgramAffiliation.findFirst({
      where: { faculty_id: userId, is_active: true },
      select: { id: true },
    });
    return { hasFacultyAffiliation: affiliation !== null };
  }

  return {};
}
export async function switchActiveRole(role: string): Promise<void> {
  const session = await resolveAuthSession();

  if (!session) {
    throw new Error("Not authenticated.");
  }

  if (!session.roles.includes(role as Role)) {
    throw new Error("You do not have access to the requested role.");
  }

  const nextRole = role as Role;

  const readiness = await resolveSelectedRoleReadiness(session.userId, nextRole);
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ROLE_COOKIE_NAME, nextRole, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACTIVE_ROLE_COOKIE_MAX_AGE_SECONDS,
  });
  // Re-resolve the gate for the incoming role so onboarding/deferral routing
  // follows the new context instead of the previous one. INACTIVE is a
  // user-level (role-independent) gate whose input is not carried by the
  // snapshot, so it is preserved rather than rebuilt.
  const profileGate =
    session.profileGate.status === "INACTIVE"
      ? session.profileGate
      : buildAuthSessionSnapshot({
          userId: session.userId,
          email: session.email,
          name: session.name,
          roles: session.roles,
          activeRole: nextRole,
          studentProfileId: session.studentProfileId,
          alumniProfileId: session.alumniProfileId,
          industryPartnerProfileId: session.industryPartnerProfileId,
          alumniVerificationStatus: session.alumniVerificationStatus,
          industryPartnerVerificationStatus: session.industryPartnerVerificationStatus,
          ...readiness,
        }).profileGate;

  const destination = resolvePostLoginDestination({
    requestedPath: null,
    intent: null,
    activeRole: nextRole,
    profileGate,
  });

  revalidatePath("/", "layout");
  redirect(destination);
}
