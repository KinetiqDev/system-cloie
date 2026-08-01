import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/utils/site-url";
import { resolveAuthSessionFromUser } from "@/features/auth/services/resolve-auth-session";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";
import { resolveSelfServiceEligibility } from "@/features/auth/services/self-service-eligibility";
import { SystemRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isRoleIntent, intentToRole } from "@/features/auth/services/role-intent";
import {
  clearLegalAcknowledgementCookie,
  LEGAL_ACKNOWLEDGEMENT_COOKIE_NAME,
  readCookieValue,
  verifyLegalAcknowledgementTicket,
} from "@/features/legal/services/legal-acknowledgement-ticket";

function getNameParts(meta: Record<string, unknown>): { first: string; last: string } | null {
  const given = typeof meta.given_name === "string" ? meta.given_name.trim() : "";
  if (given) {
    const family = typeof meta.family_name === "string" ? meta.family_name.trim() : "";
    return { first: given, last: family };
  }

  const full = typeof meta.full_name === "string" ? meta.full_name.trim() : "";
  if (full) {
    const parts = full.split(/\s+/);
    if (parts.length === 1) return { first: parts[0], last: "" };
    return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
  }

  const name = typeof meta.name === "string" ? meta.name.trim() : "";
  if (name) {
    const parts = name.split(/\s+/);
    if (parts.length === 1) return { first: parts[0], last: "" };
    return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const siteUrl = getSiteUrl(origin);

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

  const supabase = await createClient();
  const { error, data } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return redirectWithClearedTicket(`${siteUrl}/login?error=auth-failure`);
  }

  const email = data.user.email || "";
  const normalizedEmail = email.trim().toLowerCase();
  const authUserId = data.user.id;

  let dbUser = null;

  const bootstrapEmail = process.env.BOOTSTRAP_SECRETARY_EMAIL?.trim().toLowerCase();
  const isBootstrapEmail = bootstrapEmail && normalizedEmail === bootstrapEmail;

  if (isBootstrapEmail) {
    dbUser = await prisma.$transaction(async (tx) => {
      const adminExists = await tx.userRole.findFirst({
        where: { role: SystemRole.SECRETARY },
      });

      if (!adminExists) {
        const existingUser = await tx.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (existingUser) {
          await tx.user.update({
            where: { id: existingUser.id },
            data: { auth_user_id: authUserId },
          });
          await tx.userRole.upsert({
            where: { user_id: existingUser.id },
            update: { role: SystemRole.SECRETARY },
            create: { user_id: existingUser.id, role: SystemRole.SECRETARY },
          });
          return tx.user.findUnique({
            where: { id: existingUser.id },
            include: { roles: true },
          });
        } else {
          const meta = data.user.user_metadata || {};
          const parsed = getNameParts(meta);
          const googleFirstName = parsed?.first ?? "System";
          const googleLastName = parsed?.last ?? "Admin";

          return tx.user.create({
            data: {
              auth_user_id: authUserId,
              email: normalizedEmail,
              first_name: googleFirstName,
              last_name: googleLastName,
              roles: {
                create: {
                  role: SystemRole.SECRETARY,
                },
              },
            },
            include: { roles: true },
          });
        }
      }
      return null;
    });
  }

  // 1. Try to find an existing user by auth_user_id
  if (!dbUser) {
    dbUser = await prisma.user.findUnique({
      where: { auth_user_id: authUserId },
      include: { roles: true },
    });
  }

  // 2. If not found by auth_user_id, link by normalized email
  if (!dbUser && normalizedEmail) {
    const matchedUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { roles: true },
    });

    if (matchedUser) {
      const meta = data.user.user_metadata || {};
      const parsed = getNameParts(meta);
      const googleFirstName = parsed?.first ?? "";
      const googleLastName = parsed?.last ?? "";

      dbUser = await prisma.user.update({
        where: { id: matchedUser.id },
        data: {
          auth_user_id: authUserId,
          first_name: matchedUser.first_name || googleFirstName || "User",
          last_name: matchedUser.last_name || googleLastName || "Name",
        },
        include: { roles: true },
      });
    }
  }

  // 3. Perform validations based on role intent or stored role
  const targetRole = intentToRole(intentParam);

  if (dbUser) {
    const userRole = dbUser.roles[0]?.role;

    if (userRole) {
      // Reject on role mismatch if intent was explicitly requested
      if (targetRole && userRole !== targetRole) {
        await supabase.auth.signOut();
        return redirectWithClearedTicket(`${siteUrl}/status/role-mismatch`);
      }

      // ACD-domain validation for internal roles
      const isInternal =
        userRole === SystemRole.STUDENT ||
        userRole === SystemRole.FACULTY ||
        userRole === SystemRole.SECRETARY ||
        userRole === SystemRole.DEAN ||
        userRole === SystemRole.PROGRAM_HEAD;
      if (isInternal) {
        const isACD =
          normalizedEmail.endsWith("@acd.edu.ph") ||
          normalizedEmail.endsWith("@acdeducation.com") ||
          isBootstrapEmail; // Bypass for bootstrap admin
        if (!isACD) {
          await supabase.auth.signOut();
          return redirectWithClearedTicket(`${siteUrl}/status/invalid-domain`);
        }
      }
    } else {
      // User exists but has no roles (i.e. roleless user)
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

        // Create user role record
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
    // New user signup
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

    // Create domain user and their single role record
    const meta = data.user.user_metadata || {};
    const parsed = getNameParts(meta);
    const googleFirstName = parsed?.first ?? "User";
    const googleLastName = parsed?.last ?? "Name";

    dbUser = await prisma.user.create({
      data: {
        auth_user_id: authUserId,
        email: normalizedEmail,
        first_name: googleFirstName,
        last_name: googleLastName,
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
