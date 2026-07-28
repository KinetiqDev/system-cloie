import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DEMO_USERS } from "@/lib/constants/demo-users";
import { prisma } from "@/lib/db/prisma";
import {
  createDemoSessionValue,
  getDemoAuthConfig,
  getDemoCookieOptions,
  DEMO_AUTH_COOKIE_NAME,
} from "@/features/auth/services/demo-auth";
import { resolveAuthSessionFromDemoUser } from "@/features/auth/services/resolve-auth-session";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";

const DEMO_USER_UNAVAILABLE_ERROR = "Demo user is unavailable.";

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
  const config = getDemoAuthConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Unavailable outside the dedicated demo deployment." },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A demo account identifier is required." }, { status: 400 });
  }

  const identifier = getRequestedIdentifier(body);
  const demoUser = identifier
    ? DEMO_USERS.find((user) => user.email === identifier && config.allowedUsers.has(user.email))
    : undefined;

  if (!demoUser) {
    return NextResponse.json(
      { error: "Demo user not found in the configured catalog." },
      { status: 404 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: demoUser.email },
    select: { email: true, id: true, is_active: true },
  });

  if (!user || !user.is_active) {
    return NextResponse.json({ error: DEMO_USER_UNAVAILABLE_ERROR }, { status: 404 });
  }

  const session = await resolveAuthSessionFromDemoUser({ id: user.id, email: user.email });
  if (!session || session.profileGate.status === "INACTIVE") {
    return NextResponse.json({ error: DEMO_USER_UNAVAILABLE_ERROR }, { status: 404 });
  }

  const cookieStore = await cookies();
  cookieStore.set(DEMO_AUTH_COOKIE_NAME, createDemoSessionValue(user.id), getDemoCookieOptions());

  const destination = resolvePostLoginDestination({
    requestedPath: "/dashboard",
    intent: null,
    activeRole: session.activeRole,
    profileGate: session.profileGate,
  });

  return NextResponse.json({ success: true, destination });
}
