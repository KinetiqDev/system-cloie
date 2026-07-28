import { cache } from "react";
import { ROLES, type Role } from "@/lib/constants/roles";
import { DEMO_USER_EMAIL_SET } from "@/lib/constants/demo-users";
import { prisma } from "@/lib/db/prisma";
import { createClient } from "@/lib/supabase/server";
import { readDevAuthCookie } from "./dev-auth";
import { buildAuthSessionSnapshot } from "./build-auth-session-snapshot";

import { getActiveTermId } from "@/features/academic-calendar/services/resolve-active-term";
import type { VerificationStatus } from "@prisma/client";

type AuthenticatedUser = {
  id: string;
  email: string | null;
};

type AuthSessionUserRecord = {
  id: string;
  is_active: boolean;
  roles: Array<{ role: Role }>;
  student_profile: { id: string } | null;
  alumni_profile: { id: string; verification_status: VerificationStatus } | null;
  industry_partner_profile: { id: string; verification_status: VerificationStatus } | null;
} | null;

const KNOWN_ROLES = new Set<Role>(Object.values(ROLES));

function isKnownRole(roleName: string): roleName is Role {
  return KNOWN_ROLES.has(roleName as Role);
}

async function resolveAuthSessionFromAuthenticatedUser(
  user: AuthenticatedUser,
  isDevAuth: boolean = false
) {
  const isDemoAllowed = process.env.NODE_ENV === "development";
  const isDemoUser = isDevAuth && isDemoAllowed && user.email ? DEMO_USER_EMAIL_SET.has(user.email) : false;
  const dbUser: AuthSessionUserRecord = await prisma.user.findUnique({
    where: isDevAuth ? { id: user.id } : { auth_user_id: user.id },
    include: {
      roles: true,
      student_profile: true,
      alumni_profile: true,
      industry_partner_profile: true,
    },
  });

  const roles: Role[] =
    dbUser?.roles
      .map((userRole) => userRole.role)
      .filter((roleName): roleName is Role => isKnownRole(roleName)) ?? [];
  const studentProfileId = dbUser?.student_profile?.id ?? null;
  const alumniProfileId = dbUser?.alumni_profile?.id ?? null;
  const industryPartnerProfileId = dbUser?.industry_partner_profile?.id ?? null;

  let hasActiveEnrollment = false;
  if (roles.includes(ROLES.STUDENT) && studentProfileId && dbUser) {
    const activeTermId = await getActiveTermId();
    if (activeTermId) {
      const enrollment = await prisma.studentEnrollment.findUnique({
        where: {
          student_user_id_term_instance_id: {
            student_user_id: dbUser.id,
            term_instance_id: activeTermId,
          },
        },
      });
      hasActiveEnrollment = !!(enrollment && enrollment.is_active);
    }
  }

  let hasFacultyAffiliation = false;
  if (roles.includes(ROLES.FACULTY) && dbUser) {
    const affiliation = await prisma.facultyProgramAffiliation.findFirst({
      where: { faculty_id: dbUser.id, is_active: true },
    });
    hasFacultyAffiliation = !!affiliation;
  }

  return buildAuthSessionSnapshot({
    userId: dbUser?.id ?? user.id,
    email: user.email,
    roles,
    studentProfileId,
    alumniProfileId,
    industryPartnerProfileId,
    isActive: dbUser?.is_active ?? true,
    alumniVerificationStatus: dbUser?.alumni_profile?.verification_status ?? null,
    industryPartnerVerificationStatus: dbUser?.industry_partner_profile?.verification_status ?? null,
    hasActiveEnrollment,
    hasFacultyAffiliation,
    isDemoUser,
  });
}

export async function resolveAuthSessionFromUser(user: AuthenticatedUser) {
  return resolveAuthSessionFromAuthenticatedUser(user, false);
}

export async function resolveAuthSessionFromDevUser(user: AuthenticatedUser) {
  return resolveAuthSessionFromAuthenticatedUser(user, true);
}

export const resolveAuthSession = cache(async function resolveAuthSession() {
  const devAuthUser = await readDevAuthCookie();

  if (devAuthUser) {
    return resolveAuthSessionFromAuthenticatedUser({
      id: devAuthUser.userId,
      email: devAuthUser.email,
    }, true);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return resolveAuthSessionFromAuthenticatedUser({
    id: user.id,
    email: user.email ?? null,
  }, false);
});
