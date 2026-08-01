import { NextResponse } from "next/server";
import { isRoleIntent, roleToIntent } from "@/features/auth/services/role-intent";
import { LEGAL_VERSIONS } from "@/features/legal/legal-versions";
import { getSiteUrl } from "@/lib/utils/site-url";
import {
  createLegalAcknowledgementTicket,
  getLegalAcknowledgementCookieOptions,
  LEGAL_ACKNOWLEDGEMENT_COOKIE_NAME,
} from "@/features/legal/services/legal-acknowledgement-ticket";

const JSON_MEDIA_TYPE = "application/json";

function hasJsonContentType(request: Request): boolean {
  const mediaType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  return mediaType === JSON_MEDIA_TYPE;
}

/**
 * CSRF boundary for the ticket-issuing endpoint.
 *
 * When the `Origin` header is present it MUST match the canonical site
 * origin (the same base `getSiteUrl` resolves for callback redirects), and
 * the request is rejected otherwise. An absent `Origin` is allowed: browsers
 * always send `Origin` on POST requests, so a missing header means the
 * request is not a browser-initiated cross-site POST and cannot be CSRF
 * forged. `Origin: null` (sandboxed iframes, opaque origins) fails to parse
 * and is rejected.
 */
function isSameSiteOrigin(origin: string | null, requestOrigin: string): boolean {
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(getSiteUrl(requestOrigin)).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!hasJsonContentType(request)) {
    return NextResponse.json(
      { error: "A legal acknowledgement requires a JSON request body." },
      { status: 415 }
    );
  }

  if (!isSameSiteOrigin(request.headers.get("origin"), new URL(request.url).origin)) {
    return NextResponse.json(
      { error: "Legal acknowledgement must originate from this site." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A legal acknowledgement is required." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "A legal acknowledgement is required." }, { status: 400 });
  }

  const value = body as Record<string, unknown>;
  const intent = typeof value.intent === "string" ? value.intent : null;
  const privacyVersion = typeof value.privacyVersion === "string" ? value.privacyVersion : null;
  const termsVersion = typeof value.termsVersion === "string" ? value.termsVersion : null;

  if (
    !intent ||
    !isRoleIntent(intent) ||
    privacyVersion !== LEGAL_VERSIONS.privacy ||
    termsVersion !== LEGAL_VERSIONS.terms
  ) {
    return NextResponse.json({ error: "The legal documents must be acknowledged using current versions." }, { status: 400 });
  }

  try {
    const response = NextResponse.json({ success: true });
    const canonicalIntent = roleToIntent(intent);
    if (!canonicalIntent) {
      return NextResponse.json({ error: "The selected role is not supported." }, { status: 400 });
    }
    response.cookies.set(
      LEGAL_ACKNOWLEDGEMENT_COOKIE_NAME,
      createLegalAcknowledgementTicket(canonicalIntent),
      getLegalAcknowledgementCookieOptions()
    );
    return response;
  } catch {
    return NextResponse.json({ error: "Legal acknowledgement is temporarily unavailable." }, { status: 503 });
  }
}
