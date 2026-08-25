import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DEMO_USERS } from "@/lib/constants/demo-users";
import { prisma } from "@/lib/db/prisma";
import {
  CI_TEST_AUTH_COOKIE_NAME,
  createCiTestSessionValue,
  getCiTestAuthConfig,
  getCiTestCookieOptions,
} from "@/features/auth/services/ci-test-auth";
import { resolveAuthSessionFromCiTestUser } from "@/features/auth/services/resolve-auth-session";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";

const CI_USER_UNAVAILABLE_ERROR = "CI test user is unavailable.";

function getRequestedIdentifier(body: unknown): string | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const value =
    (body as { identifier?: unknown; email?: unknown }).identifier ??
    (body as { email?: unknown }).email;
  return typeof value === "string" ? value.trim().toLowerCase() : null;
}

export async function POST(request: Request) {
  const config = getCiTestAuthConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Unavailable outside the disposable CI environment." },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A CI test account identifier is required." }, { status: 400 });
  }

  const identifier = getRequestedIdentifier(body);
  const demoUser = identifier
    ? DEMO_USERS.find((user) => user.email === identifier && config.allowedUsers.has(user.email))
    : undefined;

  if (!demoUser) {
    return NextResponse.json(
      { error: "CI test user not found in the configured catalog." },
      { status: 404 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: demoUser.email },
    select: { email: true, id: true, is_active: true },
  });

  if (!user || !user.is_active) {
    return NextResponse.json({ error: CI_USER_UNAVAILABLE_ERROR }, { status: 404 });
  }

  const session = await resolveAuthSessionFromCiTestUser({ id: user.id, email: user.email });
  if (!session || session.profileGate.status === "INACTIVE") {
    return NextResponse.json({ error: CI_USER_UNAVAILABLE_ERROR }, { status: 404 });
  }

  const cookieStore = await cookies();
  cookieStore.set(CI_TEST_AUTH_COOKIE_NAME, createCiTestSessionValue(user.id), getCiTestCookieOptions());

  const destination = resolvePostLoginDestination({
    requestedPath: "/dashboard",
    intent: null,
    activeRole: session.activeRole,
    profileGate: session.profileGate,
  });

  return NextResponse.json({ success: true, destination });
}
