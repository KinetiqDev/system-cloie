import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { DEV_AUTH_COOKIE_NAME } from "@/features/auth/services/dev-auth";
import { resolveAuthSessionFromDevUser } from "@/features/auth/services/resolve-auth-session";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Unavailable outside development." }, { status: 404 });
  }

  const { email } = (await request.json()) as { email?: string };

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      email: true,
      id: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Demo user not found in seed data." }, { status: 404 });
  }

  const cookieStore = await cookies();
  cookieStore.set(
    DEV_AUTH_COOKIE_NAME,
    JSON.stringify({
      email: user.email,
      userId: user.id,
    }),
    {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
    }
  );

  const session = await resolveAuthSessionFromDevUser({
    id: user.id,
    email: user.email,
  });

  const destination = resolvePostLoginDestination({
    requestedPath: "/dashboard",
    intent: null,
    activeRole: session.activeRole,
    profileGate: session.profileGate,
  });

  return NextResponse.json({ success: true, destination });
}
