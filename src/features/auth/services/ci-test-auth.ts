import { createHmac, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import { cookies } from "next/headers";
import { DEMO_USER_EMAIL_SET } from "@/lib/constants/demo-users";
import { verifyDisposableDatabaseTarget } from "@/lib/db/verify-database-target";
export const CI_TEST_AUTH_COOKIE_NAME = "cloie_ci_test_auth";
// fallow-ignore-next-line unused-export
export const CI_TEST_DEPLOYMENT_KIND = "ci-test";
// fallow-ignore-next-line unused-export
export const CI_TEST_SESSION_MAX_AGE_SECONDS = 60 * 60;
const CI_TEST_CLOCK_SKEW_SECONDS = 60;

type CiTestSessionPayload = {
  userId: string;
  issuedAt: number;
  expiresAt: number;
};
// fallow-ignore-next-line unused-type
export type CiTestAuthConfig = {
  sessionSecret: string;
  allowedUsers: ReadonlySet<string>;
};

function decodeBase64Url(value: string): Buffer | null {
  try {
    return Buffer.from(value, "base64url");
  } catch {
    return null;
  }
}

function encodePayload(payload: CiTestSessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function isValidSessionPayload(value: unknown): value is CiTestSessionPayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  const payload = value as Partial<CiTestSessionPayload>;
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
export function getCiTestAuthConfig(
  environment: NodeJS.ProcessEnv = process.env
): CiTestAuthConfig | null {
  if (environment.NODE_ENV !== "production" || environment.CLOIE_CI_TEST_ENABLED !== "true") {
    return null;
  }
  if (environment.CLOIE_DEPLOYMENT_KIND !== CI_TEST_DEPLOYMENT_KIND) {
    return null;
  }

  // Fail closed on primary production and dedicated demo deployments even if
  // CI test variables are present. CI test auth is restricted to the
  // disposable CI environment, which must not declare a backend identity.
  if (
    environment.CLOIE_BACKEND_ID ||
    environment.CLOIE_PRIMARY_BACKEND_ID ||
    environment.CLOIE_DEMO_BACKEND_ID
  ) {
    return null;
  }
  // Independently verified CI deployment identity: require a filesystem marker
  // that is only present in the disposable CI environment (created by the CI
  // workflow before starting the production server). This cannot be enabled
  // via ordinary env vars alone on primary production.
  const markerPath = environment.CLOIE_CI_TEST_MARKER_PATH || "/tmp/cloie-ci-test-marker";
  if (!existsSync(markerPath)) {
    return null;
  }

  if (!verifyDisposableDatabaseTarget(environment).valid) {
    return null;
  }

  // Enforce a dedicated CI target identity: the disposable database must be
  // the CI test database (cloie_test), not an ordinary primary database
  // even when hosted on the allowlisted localhost host.
  if (!environment.DATABASE_URL?.includes("/cloie_test")) {
    return null;
  }

  const sessionSecret = environment.CLOIE_CI_TEST_SESSION_SECRET;
  const allowedUsers = parseAllowedUsers(environment.CLOIE_CI_TEST_ALLOWED_USERS);

  if (!sessionSecret || sessionSecret.length < 32 || !allowedUsers) {
    return null;
  }

  return { sessionSecret, allowedUsers };
}

export function createCiTestSessionValue(
  userId: string,
  now = Math.floor(Date.now() / 1000)
): string {
  const config = getCiTestAuthConfig();
  if (!config || !userId) {
    throw new Error("CI test authentication is not configured.");
  }

  const payload: CiTestSessionPayload = {
    userId,
    issuedAt: now,
    expiresAt: now + CI_TEST_SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = encodePayload(payload);

  return `${encodedPayload}.${signPayload(encodedPayload, config.sessionSecret)}`;
}
export function verifyCiTestSessionValue(
  value: string,
  now = Math.floor(Date.now() / 1000)
): CiTestSessionPayload | null {
  const config = getCiTestAuthConfig();
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
      payload.issuedAt > now + CI_TEST_CLOCK_SKEW_SECONDS ||
      payload.expiresAt - payload.issuedAt > CI_TEST_SESSION_MAX_AGE_SECONDS
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function readCiTestAuthCookie(): Promise<{ userId: string } | null> {
  if (!getCiTestAuthConfig()) {
    return null;
  }

  const cookieValue = (await cookies()).get(CI_TEST_AUTH_COOKIE_NAME)?.value;
  if (!cookieValue) {
    return null;
  }

  const payload = verifyCiTestSessionValue(cookieValue);
  return payload ? { userId: payload.userId } : null;
}

export function getCiTestCookieOptions() {
  return {
    httpOnly: true,
    maxAge: CI_TEST_SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV !== "development",
  };
}
