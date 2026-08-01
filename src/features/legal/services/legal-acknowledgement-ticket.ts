import { createHmac, timingSafeEqual } from "node:crypto";
import { LEGAL_VERSIONS } from "../legal-versions";
import { isRoleIntent, roleToIntent, type RoleIntent } from "@/features/auth/services/role-intent";

export const LEGAL_ACKNOWLEDGEMENT_COOKIE_NAME = "cloie_legal_ack";
export const LEGAL_ACKNOWLEDGEMENT_MAX_AGE_SECONDS = 15 * 60;
const CLOCK_SKEW_SECONDS = 60;

type LegalAcknowledgementPayload = {
  intent: RoleIntent;
  privacyVersion: string;
  termsVersion: string;
  issuedAt: number;
  expiresAt: number;
};

export type LegalTicketVerification =
  | { valid: true; payload: LegalAcknowledgementPayload }
  | { valid: false; reason: string };

function getSecret(): string | null {
  const secret = process.env.CLOIE_LEGAL_TICKET_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

const BASE64URL_COMPONENT_PATTERN = /^[A-Za-z0-9_-]+$/;

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

/**
 * Rejects components that are not valid unpadded base64url:
 * every character must be in the base64url alphabet, and the length must
 * not be congruent to 1 mod 4 (unpadded base64url encodes 3 bytes as 2, 3,
 * or 4 characters, so a length of 4n+1 can never decode to whole bytes).
 */
function isBase64UrlComponent(value: string): boolean {
  if (value.length === 0 || value.length % 4 === 1) return false;
  return BASE64URL_COMPONENT_PATTERN.test(value);
}

function decode(value: string): Buffer | null {
  if (!isBase64UrlComponent(value)) return null;
  const decoded = Buffer.from(value, "base64url");
  return decoded.toString("base64url") === value ? decoded : null;
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function isPayload(value: unknown): value is LegalAcknowledgementPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<LegalAcknowledgementPayload>;
  return (
    typeof payload.intent === "string" &&
    isRoleIntent(payload.intent) &&
    payload.privacyVersion === LEGAL_VERSIONS.privacy &&
    payload.termsVersion === LEGAL_VERSIONS.terms &&
    Number.isSafeInteger(payload.issuedAt) &&
    Number.isSafeInteger(payload.expiresAt) &&
    typeof payload.issuedAt === "number" &&
    typeof payload.expiresAt === "number" &&
    payload.expiresAt > payload.issuedAt
  );
}

export function createLegalAcknowledgementTicket(
  intent: RoleIntent,
  now = Math.floor(Date.now() / 1000)
): string {
  const secret = getSecret();
  if (!secret) throw new Error("Legal acknowledgement ticket signing is not configured.");

  const payload: LegalAcknowledgementPayload = {
    intent,
    privacyVersion: LEGAL_VERSIONS.privacy,
    termsVersion: LEGAL_VERSIONS.terms,
    issuedAt: now,
    expiresAt: now + LEGAL_ACKNOWLEDGEMENT_MAX_AGE_SECONDS,
  };
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function verifyLegalAcknowledgementTicket(
  value: string | null | undefined,
  intent: string,
  now = Math.floor(Date.now() / 1000)
): LegalTicketVerification {
  const secret = getSecret();
  if (!secret) return { valid: false, reason: "not-configured" };
  if (!value || !isRoleIntent(intent)) return { valid: false, reason: "missing-or-invalid-intent" };

  const [encodedPayload, encodedSignature, ...extraParts] = value.split(".");
  if (
    !encodedPayload ||
    !encodedSignature ||
    extraParts.length > 0 ||
    !isBase64UrlComponent(encodedPayload) ||
    !isBase64UrlComponent(encodedSignature)
  ) {
    return { valid: false, reason: "malformed" };
  }

  const payloadBytes = decode(encodedPayload);
  const signature = decode(encodedSignature);
  const expectedSignature = decode(sign(encodedPayload, secret));
  if (!payloadBytes || !signature || !expectedSignature) {
    return { valid: false, reason: "malformed" };
  }
  if (signature.length !== expectedSignature.length) {
    return { valid: false, reason: "invalid-signature" };
  }
  if (!timingSafeEqual(signature, expectedSignature)) {
    return { valid: false, reason: "invalid-signature" };
  }

  try {
    const payload = JSON.parse(payloadBytes.toString("utf8")) as unknown;
    if (!isPayload(payload) || payload.intent !== roleToIntent(intent)) {
      return { valid: false, reason: "intent-or-version-mismatch" };
    }
    if (
      payload.expiresAt <= now ||
      payload.issuedAt > now + CLOCK_SKEW_SECONDS ||
      payload.expiresAt - payload.issuedAt > LEGAL_ACKNOWLEDGEMENT_MAX_AGE_SECONDS
    ) {
      return { valid: false, reason: "expired" };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false, reason: "malformed" };
  }
}

export function getLegalAcknowledgementCookieOptions() {
  return {
    httpOnly: true,
    maxAge: LEGAL_ACKNOWLEDGEMENT_MAX_AGE_SECONDS,
    path: "/api/auth",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV !== "development",
  };
}

export function clearLegalAcknowledgementCookie(response: {
  cookies: { set: (name: string, value: string, options: Record<string, unknown>) => void };
}) {
  response.cookies.set(LEGAL_ACKNOWLEDGEMENT_COOKIE_NAME, "", {
    ...getLegalAcknowledgementCookieOptions(),
    maxAge: 0,
  });
}

export function readCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const entry = cookieHeader.split(";").find((part) => part.trim().startsWith(`${name}=`));
  if (!entry) return null;
  try {
    return decodeURIComponent(entry.trim().slice(name.length + 1));
  } catch {
    return null;
  }
}
