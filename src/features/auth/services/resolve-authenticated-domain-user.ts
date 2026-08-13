import type { VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type AuthenticatedDomainUser = {
  id: string;
  email: string;
  name: string;
  auth_user_id: string | null;
  is_active: boolean;
  alumni_profile: { verification_status: VerificationStatus } | null;
  industry_partner_profile: { verification_status: VerificationStatus } | null;
};

const authenticatedDomainUserSelect = {
  id: true,
  email: true,
  name: true,
  auth_user_id: true,
  is_active: true,
  alumni_profile: {
    select: { verification_status: true },
  },
  industry_partner_profile: {
    select: { verification_status: true },
  },
} as const;

/**
 * Resolves the domain User for self-service registration from the server session.
 * Prefers `auth_user_id`; falls back to exact normalized email only for an
 * unlinked User (`auth_user_id` null). A normalized-email match already linked
 * to a different Auth identity fails closed (returns null).
 * Does not create users and does not mutate identity fields.
 */
export async function resolveAuthenticatedDomainUser(input: {
  authUserId: string;
  email: string;
}): Promise<AuthenticatedDomainUser | null> {
  const byAuth = await prisma.user.findUnique({
    where: { auth_user_id: input.authUserId },
    select: authenticatedDomainUserSelect,
  });
  if (byAuth) {
    return byAuth;
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  const byEmail = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: authenticatedDomainUserSelect,
  });

  // Fail closed on identity conflict: email belongs to a User linked elsewhere.
  if (!byEmail || byEmail.auth_user_id !== null) {
    return null;
  }

  return byEmail;
}
