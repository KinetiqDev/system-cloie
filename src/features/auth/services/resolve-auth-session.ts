import { cache } from "react";
import { ROLES, type Role } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { createClient } from "@/lib/supabase/server";
import { getCiTestAuthConfig, readCiTestAuthCookie } from "./ci-test-auth";
import { readDevAuthCookie } from "./dev-auth";
import { getDemoAuthConfig, readDemoAuthCookie } from "./demo-auth";
import { buildAuthSessionSnapshot, type AuthSessionSnapshot } from "./build-auth-session-snapshot";
import { readActiveRoleCookie } from "./active-role-cookie";
import { getActiveTermId } from "@/features/academic-calendar/services/resolve-active-term";
import type { FacultyApprovalStatus, VerificationStatus } from "@prisma/client";
import { resolveAuthMethodForSession, type AuthMethod } from "./resolve-auth-method";

type AuthenticatedUser = {
  id: string;
  email: string | null;
  /** Verified access-token claims; the only source of the session's amr method. */
  claims?: unknown;
};
type AuthSessionUserRecord = {
  id: string;
  email: string;
  name: string;
  auth_user_id: string | null;
  is_active: boolean;
  roles: Array<{ role: Role }>;
  student_profile: { id: string } | null;
  alumni_profile: { id: string; verification_status: VerificationStatus } | null;
  industry_partner_profile: { id: string; verification_status: VerificationStatus } | null;
  faculty_access_request_owned: { status: FacultyApprovalStatus } | null;
} | null;

const KNOWN_ROLES = new Set<Role>(Object.values(ROLES));

function isKnownRole(roleName: string): roleName is Role {
  return KNOWN_ROLES.has(roleName as Role);
}
function resolveAuthSessionFromAuthenticatedUser(
  user: AuthenticatedUser,
  mode: "oauth" | "dev"
): Promise<AuthSessionSnapshot>;
function resolveAuthSessionFromAuthenticatedUser(
  user: AuthenticatedUser,
  mode: "dedicated-demo" | "ci-test"
): Promise<AuthSessionSnapshot | null>;
async function resolveAuthSessionFromAuthenticatedUser(
  user: AuthenticatedUser,
  mode: "oauth" | "dev" | "dedicated-demo" | "ci-test"
) {
  const isDevAuth = mode === "dev";
  const isDedicatedDemo = mode === "dedicated-demo";
  const isCiTest = mode === "ci-test";
  const demoConfig = isDedicatedDemo ? getDemoAuthConfig() : null;
  if (isDedicatedDemo && !demoConfig) {
    return null;
  }
  const ciTestConfig = isCiTest ? getCiTestAuthConfig() : null;
  if (isCiTest && !ciTestConfig) {
    return null;
  }

  // Every session binds to exactly one domain User through the unique
  // `auth_user_id` link; an unlinked or foreign identity resolves to no
  // account rather than an email-matched approximation.
  const dbUser: AuthSessionUserRecord = await prisma.user.findUnique({
    where: isDevAuth || isDedicatedDemo || isCiTest ? { id: user.id } : { auth_user_id: user.id },
    include: {
      roles: true,
      student_profile: true,
      alumni_profile: true,
      industry_partner_profile: true,
      faculty_access_request_owned: true,
    },
  });
  const authMethod: AuthMethod | null = resolveAuthMethodForSession(mode, user.claims);

  if (isDedicatedDemo) {
    if (!dbUser || !demoConfig?.allowedUsers.has(dbUser.email.trim().toLowerCase())) {
      return null;
    }
  }

  if (isCiTest) {
    if (!dbUser || !ciTestConfig?.allowedUsers.has(dbUser.email.trim().toLowerCase())) {
      return null;
    }
  }

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

  const requestedActiveRole = await readActiveRoleCookie();
  const activeRole =
    requestedActiveRole !== null && roles.includes(requestedActiveRole as Role)
      ? (requestedActiveRole as Role)
      : null;

  return buildAuthSessionSnapshot({
    userId: dbUser?.id ?? user.id,
    email: isDedicatedDemo || isCiTest ? (dbUser?.email ?? null) : user.email,
    // Domain User.name only — never invent from email or provider metadata here.
    name: dbUser?.name ?? null,
    roles,
    activeRole,
    studentProfileId,
    alumniProfileId,
    industryPartnerProfileId,
    isActive: dbUser?.is_active ?? true,
    alumniVerificationStatus: dbUser?.alumni_profile?.verification_status ?? null,
    industryPartnerVerificationStatus:
      dbUser?.industry_partner_profile?.verification_status ?? null,
    hasActiveEnrollment,
    hasFacultyAffiliation,
    // A Secretary-provisioned Faculty has no request row and stays immediate.
    facultyApprovalStatus: dbUser?.faculty_access_request_owned?.status ?? null,
    authMethod,
  });
}

export async function resolveAuthSessionFromUser(user: AuthenticatedUser) {
  return resolveAuthSessionFromAuthenticatedUser(user, "oauth");
}

export async function resolveAuthSessionFromDevUser(user: AuthenticatedUser) {
  return resolveAuthSessionFromAuthenticatedUser(user, "dev");
}

export async function resolveAuthSessionFromCiTestUser(user: AuthenticatedUser) {
  return resolveAuthSessionFromAuthenticatedUser(user, "ci-test");
}

export async function resolveAuthSessionFromDemoUser(user: AuthenticatedUser) {
  return resolveAuthSessionFromAuthenticatedUser(user, "dedicated-demo");
}
export const resolveAuthSession = cache(async function resolveAuthSession() {
  const devAuthUser = await readDevAuthCookie();

  if (devAuthUser) {
    return resolveAuthSessionFromAuthenticatedUser(
      {
        id: devAuthUser.userId,
        email: devAuthUser.email,
      },
      "dev"
    );
  }

  const ciTestAuthUser = await readCiTestAuthCookie();
  if (ciTestAuthUser) {
    return resolveAuthSessionFromAuthenticatedUser(
      {
        id: ciTestAuthUser.userId,
        email: null,
      },
      "ci-test"
    );
  }

  const demoAuthUser = await readDemoAuthCookie();
  if (demoAuthUser) {
    return resolveAuthSessionFromAuthenticatedUser(
      {
        id: demoAuthUser.userId,
        email: null,
      },
      "dedicated-demo"
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  // getClaims verifies the access token against Auth; an unproved method
  // resolves to null and therefore grants no internal role.
  const { data: claimsData } = await supabase.auth.getClaims();

  return resolveAuthSessionFromAuthenticatedUser(
    {
      id: user.id,
      email: user.email ?? null,
      claims: claimsData?.claims ?? null,
    },
    "oauth"
  );
});
