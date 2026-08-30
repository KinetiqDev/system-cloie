import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { DEMO_USER_EMAIL_SET } from "@/lib/constants/demo-users";

export const DEMO_AUTH_COOKIE_NAME = "cloie_demo_auth";
export const DEMO_DEPLOYMENT_KIND = "dedicated-demo";
export const DEMO_SESSION_MAX_AGE_SECONDS = 60 * 60;
const DEMO_SESSION_CLOCK_SKEW_SECONDS = 60;

type DemoSessionPayload = {
  userId: string;
  issuedAt: number;
  expiresAt: number;
};

export type DemoAuthConfig = {
  sessionSecret: string;
  allowedUsers: ReadonlySet<string>;
};

function hasDedicatedDemoBackendIdentity(environment: NodeJS.ProcessEnv): boolean {
  const backendId = environment.CLOIE_BACKEND_ID;
  const demoBackendId = environment.CLOIE_DEMO_BACKEND_ID;
  const primaryBackendId = environment.CLOIE_PRIMARY_BACKEND_ID;

  // The running backend must positively declare the dedicated demo identity
  // and differ from primary Production. Identifiers are opaque server-only
  // values compared by exact equality — never derived from URL hostnames.
  return !!(
    backendId &&
    demoBackendId &&
    primaryBackendId &&
    backendId === demoBackendId &&
    demoBackendId !== primaryBackendId
  );
}

function decodeBase64Url(value: string): Buffer | null {
  try {
    return Buffer.from(value, "base64url");
  } catch {
    return null;
  }
}

function encodePayload(payload: DemoSessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function isValidSessionPayload(value: unknown): value is DemoSessionPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<DemoSessionPayload>;
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

function parseAllowedUsers(value: string | undefined): ReadonlySet<string> | null {
  const users = value
    ?.split(/[\n,]/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (!users?.length || users.some((email) => !DEMO_USER_EMAIL_SET.has(email))) {
    return null;
  }

  return new Set(users);
}

export function getDemoAuthConfig(): DemoAuthConfig | null {
  if (process.env.NODE_ENV !== "production" || process.env.CLOIE_DEMO_ENABLED !== "true") {
    return null;
  }

  if (process.env.CLOIE_DEPLOYMENT_KIND !== DEMO_DEPLOYMENT_KIND) {
    return null;
  }

  if (!hasDedicatedDemoBackendIdentity(process.env)) {
    return null;
  }

  const sessionSecret = process.env.CLOIE_DEMO_SESSION_SECRET;
  const allowedUsers = parseAllowedUsers(process.env.CLOIE_DEMO_ALLOWED_USERS);

  if (!sessionSecret || sessionSecret.length < 32 || !allowedUsers) {
    return null;
  }

  return { sessionSecret, allowedUsers };
}

export function createDemoSessionValue(
  userId: string,
  now = Math.floor(Date.now() / 1000)
): string {
  const config = getDemoAuthConfig();
  if (!config || !userId) {
    throw new Error("Dedicated demo authentication is not configured.");
  }

  const payload: DemoSessionPayload = {
    userId,
    issuedAt: now,
    expiresAt: now + DEMO_SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = encodePayload(payload);

  return `${encodedPayload}.${signPayload(encodedPayload, config.sessionSecret)}`;
}

export function verifyDemoSessionValue(
  value: string,
  now = Math.floor(Date.now() / 1000)
): DemoSessionPayload | null {
  const config = getDemoAuthConfig();
  if (!config) {
    return null;
  }

  const [encodedPayload, encodedSignature, ...extraParts] = value.split(".");
  if (!encodedPayload || !encodedSignature || extraParts.length > 0) {
    return null;
  }

  const signature = decodeBase64Url(encodedSignature);
  const expectedSignature = decodeBase64Url(signPayload(encodedPayload, config.sessionSecret));
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
      payload.issuedAt > now + DEMO_SESSION_CLOCK_SKEW_SECONDS ||
      payload.expiresAt - payload.issuedAt > DEMO_SESSION_MAX_AGE_SECONDS
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function readDemoAuthCookie(): Promise<{ userId: string } | null> {
  if (!getDemoAuthConfig()) {
    return null;
  }

  const cookieValue = (await cookies()).get(DEMO_AUTH_COOKIE_NAME)?.value;
  if (!cookieValue) {
    return null;
  }

  const payload = verifyDemoSessionValue(cookieValue);
  return payload ? { userId: payload.userId } : null;
}

export function getDemoCookieOptions() {
  return {
    httpOnly: true,
    maxAge: DEMO_SESSION_MAX_AGE_SECONDS,
    path: "/",
    // Lax permits the role-switcher redirect while excluding cross-site subrequests.
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV !== "development",
  };
}
