import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { resolveAuthMethodFromClaims } from "./resolve-auth-method";

export const SIGNUP_SESSION_COOKIE_NAME = "cloie_signup_session";
const MAX_AGE_SECONDS = 60 * 60;

function sessionIdentity(
  claims: unknown
): { userId: string; sessionId: string; expiresAt: number } | null {
  if (!claims || typeof claims !== "object") return null;
  const token = claims as Record<string, unknown>;
  if (
    typeof token.sub !== "string" ||
    !token.sub ||
    typeof token.session_id !== "string" ||
    !token.session_id ||
    typeof token.exp !== "number" ||
    !Number.isSafeInteger(token.exp)
  )
    return null;
  return { userId: token.sub, sessionId: token.session_id, expiresAt: token.exp };
}

/** Mint only after GoTrue accepts a code with the strict `signup` purpose. */
export async function rememberVerifiedSignupSession(claims: unknown): Promise<void> {
  const identity = sessionIdentity(claims);
  const secret = process.env.CLOIE_LEGAL_TICKET_SECRET;
  const now = Math.floor(Date.now() / 1000);
  if (
    !identity ||
    identity.expiresAt <= now ||
    resolveAuthMethodFromClaims(claims) !== "otp" ||
    !secret ||
    secret.length < 32
  ) {
    throw new Error("Verified signup session proof is unavailable.");
  }
  const expiresAt = Math.min(identity.expiresAt, now + MAX_AGE_SECONDS);
  const payload = Buffer.from(JSON.stringify({ ...identity, expiresAt }), "utf8").toString(
    "base64url"
  );
  const signature = createHmac("sha256", secret)
    .update(`signup-session:${payload}`)
    .digest("base64url");
  (await cookies()).set(SIGNUP_SESSION_COOKIE_NAME, `${payload}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax",
    path: "/",
    maxAge: expiresAt - now,
  });
}

/** Raw OTP claims never authorize a workspace without this exact signup-session proof. */
export function verifySignupSessionProof(value: string | undefined, claims: unknown): boolean {
  const identity = sessionIdentity(claims);
  const secret = process.env.CLOIE_LEGAL_TICKET_SECRET;
  if (
    !value ||
    !identity ||
    !secret ||
    secret.length < 32 ||
    resolveAuthMethodFromClaims(claims) !== "otp"
  )
    return false;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra !== undefined) return false;
  try {
    const provided = Buffer.from(signature, "base64url");
    const expected = createHmac("sha256", secret).update(`signup-session:${payload}`).digest();
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return false;
    const proof: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!proof || typeof proof !== "object") return false;
    const stored = proof as Record<string, unknown>;
    return (
      stored.userId === identity.userId &&
      stored.sessionId === identity.sessionId &&
      typeof stored.expiresAt === "number" &&
      Number.isSafeInteger(stored.expiresAt) &&
      stored.expiresAt > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}
