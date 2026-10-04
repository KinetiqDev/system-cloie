import { cookies } from "next/headers";
import {
  createSignedSessionValue,
  parseAllowedUsers,
  verifySignedSessionValue,
  type SignedSessionLimits,
  type SignedSessionPayload,
} from "@/features/auth/services/signed-session";

export const DEMO_AUTH_COOKIE_NAME = "cloie_demo_auth";
export const DEMO_DEPLOYMENT_KIND = "dedicated-demo";
const DEMO_SESSION_MAX_AGE_SECONDS = 60 * 60;
const DEMO_SESSION_CLOCK_SKEW_SECONDS = 60;

const SIGNED_SESSION_LIMITS: SignedSessionLimits = {
  maxAgeSeconds: DEMO_SESSION_MAX_AGE_SECONDS,
  clockSkewSeconds: DEMO_SESSION_CLOCK_SKEW_SECONDS,
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

  return createSignedSessionValue(config.sessionSecret, userId, now, SIGNED_SESSION_LIMITS);
}

export function verifyDemoSessionValue(
  value: string,
  now = Math.floor(Date.now() / 1000)
): SignedSessionPayload | null {
  const config = getDemoAuthConfig();
  if (!config) {
    return null;
  }

  return verifySignedSessionValue(value, config.sessionSecret, now, SIGNED_SESSION_LIMITS);
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
