import { SystemRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { GOOGLE_ONLY_ROLES } from "@/features/users/services/resolve-profile-gate";

const GOOGLE_ONLY_ROLE_SET = new Set<SystemRole>(GOOGLE_ONLY_ROLES);

export type ExternalIdentityLinkOutcome = {
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
 * This lives in a server-only service rather than the `"use server"` action
 * module so that importing the action from a Client Component never reaches
 * Prisma through the module graph.
 */
export async function linkExternalVerifiedIdentity(input: {
  authUserId: string;
  email: string;
  name: string | null;
}): Promise<ExternalIdentityLinkOutcome> {
  const email = input.email.trim().toLowerCase();
  if (!email) return { linked: false, existingUserId: null };

  return prisma.$transaction(async (tx) => {
    const byAuth = await tx.user.findUnique({ where: { auth_user_id: input.authUserId } });
    if (byAuth) return { linked: true, existingUserId: byAuth.id };

    const byEmail = await tx.user.findUnique({
      where: { email },
      include: { roles: { select: { role: true } } },
    });
    if (byEmail) {
      const hasInternalRole = byEmail.roles.some((row) => GOOGLE_ONLY_ROLE_SET.has(row.role));
      if (hasInternalRole) {
        return { linked: false, existingUserId: byEmail.id };
      }

      // Unlinked external-eligible account: link the verified identity and
      // store the name collected at signup, then stop.
      if (!byEmail.auth_user_id) {
        const updated = await tx.user.updateMany({
          where: { id: byEmail.id, auth_user_id: null },
          data: {
            auth_user_id: input.authUserId,
            ...(input.name ? { name: input.name } : {}),
          },
        });
        if (updated.count === 1) return { linked: true, existingUserId: byEmail.id };
      }
      // Already linked to another identity, or the race was lost: never
      // overwrite the existing link.
      return { linked: false, existingUserId: byEmail.id };
    }

    if (!input.name) return { linked: false, existingUserId: null };

    const created = await tx.user.create({
      data: { auth_user_id: input.authUserId, email, name: input.name },
      select: { id: true },
    });
    return { linked: true, existingUserId: created.id };
  });
}
