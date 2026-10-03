"use server";

import { SystemRole } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { redirect } from "next/navigation";

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
    const targetMayBeIncomplete =
      target !== session.activeRole || session.profileGate.status !== "COMPLETE";
    const incomplete =
      targetMayBeIncomplete && (await isRoleClaimIncomplete(session.userId, target));
    if (incomplete) {
      await prisma.userRole.delete({
        where: { user_id_role: { user_id: session.userId, role: target } },
      });
    }
  }

  // Route back to the entrance matching the role being onboarded:
  // staff roles (faculty) → /login/staff; respondent roles → /.
  const isStaffClaim =
    target === ROLES.FACULTY ||
    (session && "intent" in session.profileGate && session.profileGate.intent === "faculty");

  redirect(isStaffClaim ? "/login/staff" : "/");
}
