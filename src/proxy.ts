import { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  const isServerAction =
    request.method === "POST" &&
    (request.headers.has("next-action") || request.headers.get("content-type")?.includes("multipart/form-data"));

  if (isServerAction && origin) {
    const originHost = new URL(origin).host;
    const headers = new Headers(request.headers);
    headers.set("x-forwarded-host", originHost);
    const rewritten = new NextRequest(request.url, { ...request, headers });
    return updateSession(rewritten);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next|favicon.ico|logos/|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
