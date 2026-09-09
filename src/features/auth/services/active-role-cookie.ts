import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const ACTIVE_ROLE_COOKIE_NAME = "cloie_active_role";

export const ACTIVE_ROLE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getActiveRoleCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function readActiveRoleCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_ROLE_COOKIE_NAME)?.value ?? null;
}

export function setActiveRoleCookie(response: NextResponse, role: string): void {
  response.cookies.set(
    ACTIVE_ROLE_COOKIE_NAME,
    role,
    getActiveRoleCookieOptions(ACTIVE_ROLE_COOKIE_MAX_AGE_SECONDS)
  );
}

export function clearActiveRoleCookie(response: NextResponse): void {
  response.cookies.set(ACTIVE_ROLE_COOKIE_NAME, "", getActiveRoleCookieOptions(0));
}
