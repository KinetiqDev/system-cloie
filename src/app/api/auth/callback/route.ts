import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrlFromRequest } from "@/lib/utils/site-url";
import { resolveAuthSessionFromUser } from "@/features/auth/services/resolve-auth-session";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";
import { resolveSelfServiceEligibility } from "@/features/auth/services/self-service-eligibility";
import { resolveGoogleAccountName } from "@/features/auth/services/resolve-google-account-name";
import { SystemRole, type User, type UserRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isRoleIntent, intentToRole } from "@/features/auth/services/role-intent";
import {
  clearLegalAcknowledgementCookie,
  LEGAL_ACKNOWLEDGEMENT_COOKIE_NAME,
  readCookieValue,
  verifyLegalAcknowledgementTicket,
} from "@/features/legal/services/legal-acknowledgement-ticket";

type DbUserWithRoles = User & { roles: UserRole[] };

type PrismaWriter = {
  user: {
    updateMany: (args: {
      where: { id: string; auth_user_id: null };
      data: { auth_user_id: string; name: string };
    }) => Promise<{ count: number }>;
    findUnique: (args: {
      where: { id: string };
      include: { roles: true };
    }) => Promise<DbUserWithRoles | null>;
  };
  userRole: {
    create: (args: {
      data: { user_id: string; role: SystemRole };
    }) => Promise<UserRole>;
  };
};

function isInternalRole(role: SystemRole): boolean {
  return (
    role === SystemRole.STUDENT ||
    role === SystemRole.FACULTY ||
    role === SystemRole.SECRETARY ||
    role === SystemRole.DEAN ||
    role === SystemRole.PROGRAM_HEAD
  );
}

function isInstitutionalEmail(normalizedEmail: string, allowBootstrap: boolean): boolean {
  return (
    normalizedEmail.endsWith("@acd.edu.ph") ||
    normalizedEmail.endsWith("@acdeducation.com") ||
    allowBootstrap
  );
}

/**
 * Conditionally claim an unlinked domain User for this Auth identity.
 * A zero-row result means another identity already won the race (or the row
 * is no longer unlinked); callers must treat that as identity-conflict.
 */
async function tryClaimUnlinkedUser(
  client: PrismaWriter,
  userId: string,
  authUserId: string,
  name: string
): Promise<"linked" | "identity-conflict"> {
  const result = await client.user.updateMany({
    where: { id: userId, auth_user_id: null },
    data: { auth_user_id: authUserId, name },
  });
  return result.count === 1 ? "linked" : "identity-conflict";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const siteUrl = getSiteUrlFromRequest(request);

  const redirectWithClearedTicket = (destination: string) => {
    const response = NextResponse.redirect(destination);
    clearLegalAcknowledgementCookie(response);
    return response;
  };

  if (!code) {
    return redirectWithClearedTicket(`${siteUrl}/login?error=auth-failure`);
  }

  const intentParam = searchParams.get("intent");
  const ticket = readCookieValue(request.headers.get("cookie"), LEGAL_ACKNOWLEDGEMENT_COOKIE_NAME);
  const ticketVerification = verifyLegalAcknowledgementTicket(ticket, intentParam ?? "");

  if (!intentParam || !isRoleIntent(intentParam) || !ticketVerification.valid) {
    return redirectWithClearedTicket(`${siteUrl}/`);
  }

  const targetRole = intentToRole(intentParam);
  const supabase = await createClient();
  const { error, data } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return redirectWithClearedTicket(`${siteUrl}/login?error=auth-failure`);
  }

  const email = data.user.email || "";
  const normalizedEmail = email.trim().toLowerCase();
  const authUserId = data.user.id;
  const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;

  let dbUser: DbUserWithRoles | null = null;

  const bootstrapEmail = process.env.BOOTSTRAP_SECRETARY_EMAIL?.trim().toLowerCase();
  const isBootstrapEmail = Boolean(bootstrapEmail && normalizedEmail === bootstrapEmail);

  if (isBootstrapEmail) {
    const bootstrapResult = await prisma.$transaction(async (tx) => {
      const adminExists = await tx.userRole.findFirst({
        where: { role: SystemRole.SECRETARY },
      });

      if (adminExists) {
        return { kind: "skip" as const };
      }

      const existingUser = await tx.user.findUnique({
        where: { email: normalizedEmail },
        include: { roles: true },
      });

      if (existingUser) {
        if (existingUser.auth_user_id && existingUser.auth_user_id !== authUserId) {
          return { kind: "identity-conflict" as const };
        }

        if (!existingUser.is_active) {
          return { kind: "inactive" as const };
        }

        if (!existingUser.auth_user_id) {
          const resolved = resolveGoogleAccountName(meta);
          if (!resolved.ok) {
            return { kind: "missing-name" as const };
          }

          const claim = await tryClaimUnlinkedUser(
            tx as unknown as PrismaWriter,
            existingUser.id,
            authUserId,
            resolved.name
          );
          if (claim === "identity-conflict") {
            return { kind: "identity-conflict" as const };
          }
        }

        await tx.userRole.upsert({
          where: { user_id: existingUser.id },
          update: { role: SystemRole.SECRETARY },
          create: { user_id: existingUser.id, role: SystemRole.SECRETARY },
        });

        const linked = await tx.user.findUnique({
          where: { id: existingUser.id },
          include: { roles: true },
        });
        return { kind: "user" as const, user: linked };
      }

      const resolved = resolveGoogleAccountName(meta);
      if (!resolved.ok) {
        return { kind: "missing-name" as const };
      }

      const created = await tx.user.create({
        data: {
          auth_user_id: authUserId,
          email: normalizedEmail,
          name: resolved.name,
          roles: {
            create: {
              role: SystemRole.SECRETARY,
            },
          },
        },
        include: { roles: true },
      });
      return { kind: "user" as const, user: created };
    });

    if (bootstrapResult.kind === "identity-conflict") {
      await supabase.auth.signOut();
      return redirectWithClearedTicket(`${siteUrl}/status/identity-conflict`);
    }
    if (bootstrapResult.kind === "inactive") {
      await supabase.auth.signOut();
      return redirectWithClearedTicket(`${siteUrl}/status/inactive`);
    }
    if (bootstrapResult.kind === "missing-name") {
      await supabase.auth.signOut();
      return redirectWithClearedTicket(`${siteUrl}/status/missing-google-name`);
    }
    if (bootstrapResult.kind === "user") {
      dbUser = bootstrapResult.user;
    }
  }

  // 1. Already-linked account: preserve stored User.name regardless of metadata.
  if (!dbUser) {
    dbUser = await prisma.user.findUnique({
      where: { auth_user_id: authUserId },
      include: { roles: true },
    });
  }

  // 1b. Fail closed when the current Auth identity is linked to one domain User
  // but the normalized OAuth email belongs to a different domain User.
  // Same-user email ownership (emailOwner.id === dbUser.id) continues.
  if (dbUser && normalizedEmail) {
    const emailOwner = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { roles: true },
    });

    if (emailOwner && emailOwner.id !== dbUser.id) {
      await supabase.auth.signOut();
      return redirectWithClearedTicket(`${siteUrl}/status/identity-conflict`);
    }
  }

  // 2. Normalized-email match for first link or identity conflict.
  if (!dbUser && normalizedEmail) {
    const matchedUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { roles: true },
    });

    if (matchedUser) {
      if (matchedUser.auth_user_id && matchedUser.auth_user_id !== authUserId) {
        await supabase.auth.signOut();
        return redirectWithClearedTicket(`${siteUrl}/status/identity-conflict`);
      }

      if (!matchedUser.auth_user_id) {
        // First-link gates must run before any mutation.
        if (!matchedUser.is_active) {
          await supabase.auth.signOut();
          return redirectWithClearedTicket(`${siteUrl}/status/inactive`);
        }

        const matchedRole = matchedUser.roles[0]?.role;

        if (matchedRole) {
          if (targetRole && matchedRole !== targetRole) {
            await supabase.auth.signOut();
            return redirectWithClearedTicket(`${siteUrl}/status/role-mismatch`);
          }

          if (
            isInternalRole(matchedRole) &&
            !isInstitutionalEmail(normalizedEmail, isBootstrapEmail)
          ) {
            await supabase.auth.signOut();
            return redirectWithClearedTicket(`${siteUrl}/status/invalid-domain`);
          }

          const resolved = resolveGoogleAccountName(meta);
          if (!resolved.ok) {
            await supabase.auth.signOut();
            return redirectWithClearedTicket(`${siteUrl}/status/missing-google-name`);
          }

          const claim = await tryClaimUnlinkedUser(
            prisma as unknown as PrismaWriter,
            matchedUser.id,
            authUserId,
            resolved.name
          );
          if (claim === "identity-conflict") {
            await supabase.auth.signOut();
            return redirectWithClearedTicket(`${siteUrl}/status/identity-conflict`);
          }

          dbUser = await prisma.user.findUnique({
            where: { id: matchedUser.id },
            include: { roles: true },
          });
        } else {
          // Roleless unlinked match: validate self-service eligibility and
          // target role/domain BEFORE any auth_user_id/name mutation. For an
          // allowed claim, atomically link/name and create the one role.
          if (!targetRole) {
            await supabase.auth.signOut();
            return redirectWithClearedTicket(`${siteUrl}/status/invalid-domain`);
          }

          const eligibilityFailure = resolveSelfServiceEligibility({
            email: normalizedEmail,
            targetRole,
            intent: intentParam,
          });
          if (eligibilityFailure) {
            await supabase.auth.signOut();
            return redirectWithClearedTicket(`${siteUrl}${eligibilityFailure.destination}`);
          }

          const resolved = resolveGoogleAccountName(meta);
          if (!resolved.ok) {
            await supabase.auth.signOut();
            return redirectWithClearedTicket(`${siteUrl}/status/missing-google-name`);
          }

          const linkResult = await prisma.$transaction(async (tx) => {
            const claim = await tryClaimUnlinkedUser(
              tx as unknown as PrismaWriter,
              matchedUser.id,
              authUserId,
              resolved.name
            );
            if (claim === "identity-conflict") {
              return { kind: "identity-conflict" as const };
            }

            await tx.userRole.create({
              data: {
                user_id: matchedUser.id,
                role: targetRole,
              },
            });

            const linked = await tx.user.findUnique({
              where: { id: matchedUser.id },
              include: { roles: true },
            });
            return { kind: "user" as const, user: linked };
          });

          if (linkResult.kind === "identity-conflict") {
            await supabase.auth.signOut();
            return redirectWithClearedTicket(`${siteUrl}/status/identity-conflict`);
          }

          dbUser = linkResult.user;
        }
      } else {
        // Same auth identity already stored on the email match.
        dbUser = matchedUser;
      }
    }
  }

  // 3. Role / domain / self-service gates and new-account creation.
  if (dbUser) {
    const userRole = dbUser.roles[0]?.role;

    if (userRole) {
      if (targetRole && userRole !== targetRole) {
        await supabase.auth.signOut();
        return redirectWithClearedTicket(`${siteUrl}/status/role-mismatch`);
      }

      if (isInternalRole(userRole) && !isInstitutionalEmail(normalizedEmail, isBootstrapEmail)) {
        await supabase.auth.signOut();
        return redirectWithClearedTicket(`${siteUrl}/status/invalid-domain`);
      }
    } else {
      if (targetRole) {
        const eligibilityFailure = resolveSelfServiceEligibility({
          email: normalizedEmail,
          targetRole,
          intent: intentParam,
        });
        if (eligibilityFailure) {
          await supabase.auth.signOut();
          return redirectWithClearedTicket(`${siteUrl}${eligibilityFailure.destination}`);
        }

        const newRole = await prisma.userRole.create({
          data: {
            user_id: dbUser.id,
            role: targetRole,
          },
        });

        dbUser.roles = [newRole];
      }
    }
  } else {
    if (!targetRole) {
      await supabase.auth.signOut();
      return redirectWithClearedTicket(`${siteUrl}/status/invalid-domain`);
    }

    const eligibilityFailure = resolveSelfServiceEligibility({
      email: normalizedEmail,
      targetRole,
      intent: intentParam,
    });
    if (eligibilityFailure) {
      await supabase.auth.signOut();
      return redirectWithClearedTicket(`${siteUrl}${eligibilityFailure.destination}`);
    }

    const resolved = resolveGoogleAccountName(meta);
    if (!resolved.ok) {
      await supabase.auth.signOut();
      return redirectWithClearedTicket(`${siteUrl}/status/missing-google-name`);
    }

    dbUser = await prisma.user.create({
      data: {
        auth_user_id: authUserId,
        email: normalizedEmail,
        name: resolved.name,
        roles: {
          create: {
            role: targetRole,
          },
        },
      },
      include: { roles: true },
    });
  }

  const session = await resolveAuthSessionFromUser({
    id: authUserId,
    email: normalizedEmail,
  });

  const nextUrl = resolvePostLoginDestination({
    requestedPath: searchParams.get("next") ?? "/dashboard",
    intent: intentParam,
    activeRole: session?.activeRole ?? null,
    profileGate: session?.profileGate ?? { status: "ROLE_SELECTION_REQUIRED" },
  });

  return redirectWithClearedTicket(`${siteUrl}${nextUrl}`);
}
