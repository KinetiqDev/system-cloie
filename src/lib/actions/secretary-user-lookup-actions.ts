"use server";

import { SystemRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";

/** Account projection the add-user form needs to pivot into "add a role". */
export type ExistingAccountLookup = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  roles: SystemRole[];
};

export type LookupUserByEmailResult =
  | { success: true; found: false }
  | { success: true; found: true; user: ExistingAccountLookup }
  | { success: false; error: string };

/**
 * Resolves whether an email already belongs to a CLOIE account so the
 * Secretary add-user form can pivot from "create account" to "add role"
 * before submitting. Authorization mirrors `createUserBySecretaryAction`
 * (the form lives under the Secretary-guarded route group).
 */
export async function lookupUserByEmailAction(email: string): Promise<LookupUserByEmailResult> {
  const session = await resolveAuthSession();
  if (!session?.roles?.includes(ROLES.SECRETARY)) {
    return { success: false, error: "Secretary access required." };
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return { success: false, error: "Enter an email address." };
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      name: true,
      email: true,
      is_active: true,
      roles: { select: { role: true } },
    },
  });

  if (!user) {
    return { success: true, found: false };
  }

  return {
    success: true,
    found: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.is_active,
      roles: user.roles.map((roleRow) => roleRow.role),
    },
  };
}
