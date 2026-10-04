import { createHmac, timingSafeEqual } from "node:crypto";
import { DEMO_USER_EMAIL_SET } from "@/lib/constants/demo-users";

/**
 * Signed short-lived session shared by the dedicated demo deployment and the
 * disposable CI test environment. Both flavors mint the same payload shape over
 * the same `payload.signature` cookie format, so the encoding, signature, and
 * verification live here once instead of drifting apart. Each flavor keeps its
 * own configuration gate, cookie name, and lifetime bounds.
 */
export type SignedSessionPayload = {
  userId: string;
  issuedAt: number;
  expiresAt: number;
};

/** Lifetime bounds a flavor pins; a payload never outranks them. */
export type SignedSessionLimits = {
  maxAgeSeconds: number;
  clockSkewSeconds: number;
};

function decodeBase64Url(value: string): Buffer | null {
  try {
    return Buffer.from(value, "base64url");
  } catch {
    return null;
  }
}

function encodePayload(payload: SignedSessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function isValidSessionPayload(value: unknown): value is SignedSessionPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<SignedSessionPayload>;
  return (
    typeof payload.userId === "string" &&
    payload.userId.length > 0 &&
    Number.isSafeInteger(payload.issuedAt) &&
    Number.isSafeInteger(payload.expiresAt) &&
    payload.expiresAt !== undefined &&
    payload.issuedAt !== undefined &&
    payload.expiresAt > payload.issuedAt
  );
}

/**
 * Mint a signed session value. The caller passes its deployment's own session
 * secret, so a flavor cannot mint anything until its configuration has already
 * proved that secret.
 */
export function createSignedSessionValue(
  sessionSecret: string,
  userId: string,
  now: number,
  limits: SignedSessionLimits
): string {
  const payload: SignedSessionPayload = {
    userId,
    issuedAt: now,
    expiresAt: now + limits.maxAgeSeconds,
  };
  const encodedPayload = encodePayload(payload);

  return `${encodedPayload}.${signPayload(encodedPayload, sessionSecret)}`;
}

/**
 * Verify a signed session value against `sessionSecret` at `now`, returning the
 * payload only when the signature matches and the session is inside `limits`.
 * A malformed value, a mismatched or wrong-length signature, or an out-of-window
 * payload is refused.
 */
export function verifySignedSessionValue(
  value: string,
  sessionSecret: string,
  now: number,
  limits: SignedSessionLimits
): SignedSessionPayload | null {
  const [encodedPayload, encodedSignature, ...extraParts] = value.split(".");
  if (!encodedPayload || !encodedSignature || extraParts.length > 0) {
    return null;
  }

  const signature = decodeBase64Url(encodedSignature);
  const expectedSignature = decodeBase64Url(signPayload(encodedPayload, sessionSecret));
  if (!signature || !expectedSignature || signature.length !== expectedSignature.length) {
    return null;
  }

  if (!timingSafeEqual(signature, expectedSignature)) {
    return null;
  }

  const payloadBytes = decodeBase64Url(encodedPayload);
  if (!payloadBytes) {
    return null;
  }

  try {
    const payload = JSON.parse(payloadBytes.toString("utf8")) as unknown;
    if (!isValidSessionPayload(payload)) {
      return null;
    }

    if (
      payload.expiresAt <= now ||
      payload.issuedAt > now + limits.clockSkewSeconds ||
      payload.expiresAt - payload.issuedAt > limits.maxAgeSeconds
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Both flavors allowlist the same seeded demo catalog: comma- or newline-separated
 * emails compared case-insensitively, refusing an empty list or any entry that is
 * not a seeded account.
 */
export function parseAllowedUsers(value: string | undefined): ReadonlySet<string> | null {
  const users = value
    ?.split(/[\n,]/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (!users?.length || users.some((email) => !DEMO_USER_EMAIL_SET.has(email))) {
    return null;
  }

  return new Set(users);
}
