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
      const hasInternalRole = byEmail.roles.some((row) => GOOGLE_ONLY_ROLE_SET.has(row.role));
      if (hasInternalRole || (!role && byEmail.roles.length === 0)) {
        return { linked: false, existingUserId: byEmail.id };
      }

      // Unlinked external-eligible account: link the verified identity, store
      // the name collected at signup, and grant the requested external role.
      if (!byEmail.auth_user_id) {
        const updated = await tx.user.updateMany({
          where: { id: byEmail.id, auth_user_id: null },
          data: {
            auth_user_id: input.authUserId,
            ...(input.name ? { name: input.name } : {}),
          },
        });
        if (updated.count === 1) {
          if (role && !byEmail.roles.some((row) => row.role === role)) {
            await tx.userRole.create({ data: { user_id: byEmail.id, role } });
          }
          return { linked: true, existingUserId: byEmail.id };
        }
      }
      // Already linked to another identity, or the race was lost: never
      // overwrite the existing link.
      return { linked: false, existingUserId: byEmail.id };
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
