import { NextResponse } from "next/server";
import { isRoleIntent, roleToIntent } from "@/features/auth/services/role-intent";
import { LEGAL_VERSIONS } from "@/features/legal/content";
import {
  createLegalAcknowledgementTicket,
  getLegalAcknowledgementCookieOptions,
  LEGAL_ACKNOWLEDGEMENT_COOKIE_NAME,
} from "@/features/legal/services/legal-acknowledgement-ticket";

export async function POST(request: Request) {
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
