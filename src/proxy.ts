import { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  SELECTED_PROGRAM_COOKIE_NAME,
  getSelectedProgramCookieOptions,
} from "@/features/auth/services/selected-program-cookie";
export async function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  const isServerAction =
    request.method === "POST" &&
    (request.headers.has("next-action") ||
      request.headers.get("content-type")?.includes("multipart/form-data"));

  if (isServerAction && origin) {
    const originHost = new URL(origin).host;
    const headers = new Headers(request.headers);
    headers.set("x-forwarded-host", originHost);
    const rewritten = new NextRequest(request.url, { ...request, headers });
    return updateSession(rewritten);
  }
  const response = await updateSession(request);

  // When navigating to a specific program route, remember the selected program in a cookie
  const programMatch = request.nextUrl.pathname.match(/^\/program-head\/programs\/([^/]+)(?:\/|$)/);
  if (programMatch?.[1]) {
    try {
      const programId = decodeURIComponent(programMatch[1]);
      response.cookies.set(
        SELECTED_PROGRAM_COOKIE_NAME,
        programId,
        getSelectedProgramCookieOptions()
      );
    } catch {
      // Ignore malformed URI component
    }
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!api/health(?:/|$)|_next|favicon.ico|logos/|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
