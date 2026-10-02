import { SystemRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { GOOGLE_ONLY_ROLES } from "@/features/users/services/resolve-profile-gate";

const GOOGLE_ONLY_ROLE_SET = new Set<SystemRole>(GOOGLE_ONLY_ROLES);

/**
 * The two roles the public external entrance may claim for itself. Anything
 * else is refused here as well as at the call site, so no caller can turn a
 * mis-validated value into an internal role grant.
 */
const EXTERNAL_ROLE_SET = new Set<SystemRole>([SystemRole.ALUMNI, SystemRole.INDUSTRY_PARTNER]);

type ExternalIdentityLinkOutcome = {
  linked: boolean;
  existingUserId: string | null;
};

/**
 * Establishes the domain account for a just-verified external identity.
 *
 * Linkage ownership rule: only an account that is external-eligible may be
 * claimed by a password-verified identity. A domain account holding an internal
 * role (Student, Faculty, Secretary, Dean, Program Head, General Education
 * Coordinator) is Secretary-provisioned and stays Google-owned — claiming it
 * here would bind the wrong identity and make the account's own Google sign-in
 * fail closed as an identity conflict, so the record is left untouched.
 *
 * Role atomically: the role the person chose at registration is written in the
 * same transaction that creates or claims the account, so a verified external
 * identity never exists in a role-less state that no onboarding can reach
 * (ADR 0001 requires role completeness at account creation).
 *
 * This lives in a server-only service rather than the `"use server"` action
 * module so that importing the action from a Client Component never reaches
 * Prisma through the module graph.
 */

/**
 * An email-matched account may be claimed only while it is unlinked and
 * external-eligible. A role-less record is claimable only when this verified
 * identity carries the role it will grant; with no role there is nothing to
 * prove the record belongs to this person, so it is left alone.
 */
function isClaimableExistingAccount(
  account: {
    auth_user_id: string | null;
    roles: Array<{ role: SystemRole }>;
  },
  role: SystemRole | null
): boolean {
  if (account.auth_user_id) return false;
  if (account.roles.some((row) => GOOGLE_ONLY_ROLE_SET.has(row.role))) return false;
  return account.roles.length > 0 || role !== null;
}

type Transaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

type LinkInput = {
  authUserId: string;
  name: string | null;
};

type ExistingAccount = {
  id: string;
  auth_user_id: string | null;
  roles: Array<{ role: SystemRole }>;
};

/**
 * Claims an email-matched account for a verified external identity: link it,
 * store the name collected at signup, and grant the requested external role.
 * An account that is not claimable, or whose link another identity won first,
 * is left exactly as it was.
 */
async function claimExistingAccount(
  tx: Transaction,
  account: ExistingAccount,
  input: LinkInput,
  role: SystemRole | null
): Promise<ExternalIdentityLinkOutcome> {
  if (!isClaimableExistingAccount(account, role)) {
    return { linked: false, existingUserId: account.id };
  }

  const updated = await tx.user.updateMany({
    where: { id: account.id, auth_user_id: null },
    data: {
      auth_user_id: input.authUserId,
      ...(input.name ? { name: input.name } : {}),
    },
  });
  if (updated.count !== 1) {
    // Already linked to another identity, or the race was lost: never
    // overwrite the existing link.
    return { linked: false, existingUserId: account.id };
  }

  if (role && !account.roles.some((row) => row.role === role)) {
    await tx.userRole.create({ data: { user_id: account.id, role } });
  }
  return { linked: true, existingUserId: account.id };
}
export async function linkExternalVerifiedIdentity(input: {
  authUserId: string;
  email: string;
  name: string | null;
  role: SystemRole | null;
}): Promise<ExternalIdentityLinkOutcome> {
  const email = input.email.trim().toLowerCase();
  if (!email) return { linked: false, existingUserId: null };

  const role = input.role && EXTERNAL_ROLE_SET.has(input.role) ? input.role : null;

  return prisma.$transaction(async (tx) => {
    const byAuth = await tx.user.findUnique({ where: { auth_user_id: input.authUserId } });
    if (byAuth) return { linked: true, existingUserId: byAuth.id };

    const byEmail = await tx.user.findUnique({
      where: { email },
      include: { roles: { select: { role: true } } },
    });
    if (byEmail) {
      return claimExistingAccount(tx, byEmail, input, role);
    }

    // A verified external identity is only ever created around the role the
    // person registered for. Creating the account without it would leave a
    // role-less record that no onboarding form can reach, so an unknown or
    // unusable role is refused here and the address stays unclaimed.
    if (!input.name || !role) return { linked: false, existingUserId: null };

    const created = await tx.user.create({
      data: {
        auth_user_id: input.authUserId,
        email,
        name: input.name,
        roles: { create: { role } },
      },
      select: { id: true },
    });
    return { linked: true, existingUserId: created.id };
  });
}
