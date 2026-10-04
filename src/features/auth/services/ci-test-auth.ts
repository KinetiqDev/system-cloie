import { existsSync } from "node:fs";
import { cookies } from "next/headers";
import { verifyDisposableDatabaseTarget } from "@/lib/db/verify-database-target";
import {
  createSignedSessionValue,
  parseAllowedUsers,
  verifySignedSessionValue,
  type SignedSessionLimits,
  type SignedSessionPayload,
} from "@/features/auth/services/signed-session";

export const CI_TEST_AUTH_COOKIE_NAME = "cloie_ci_test_auth";
// fallow-ignore-next-line unused-export
export const CI_TEST_DEPLOYMENT_KIND = "ci-test";
const CI_TEST_SESSION_MAX_AGE_SECONDS = 60 * 60;
const CI_TEST_CLOCK_SKEW_SECONDS = 60;

const SIGNED_SESSION_LIMITS: SignedSessionLimits = {
  maxAgeSeconds: CI_TEST_SESSION_MAX_AGE_SECONDS,
  clockSkewSeconds: CI_TEST_CLOCK_SKEW_SECONDS,
};

// fallow-ignore-next-line unused-type
export type CiTestAuthConfig = {
  sessionSecret: string;
  allowedUsers: ReadonlySet<string>;
};

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
  if (!existsSync(/* turbopackIgnore: true */ markerPath)) {
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

  return createSignedSessionValue(config.sessionSecret, userId, now, SIGNED_SESSION_LIMITS);
}

export function verifyCiTestSessionValue(
  value: string,
  now = Math.floor(Date.now() / 1000)
): SignedSessionPayload | null {
  const config = getCiTestAuthConfig();
  if (!config) {
    return null;
  }

  return verifySignedSessionValue(value, config.sessionSecret, now, SIGNED_SESSION_LIMITS);
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
