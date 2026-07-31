/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCookieMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: getCookieMock })),
}));

import {
  createDemoSessionValue,
  DEMO_AUTH_COOKIE_NAME,
  DEMO_DEPLOYMENT_KIND,
  getDemoAuthConfig,
  getDemoCookieOptions,
  readDemoAuthCookie,
  verifyDemoSessionValue,
} from "@/features/auth/services/demo-auth";

const SECRET = "a".repeat(32);
const USER_EMAIL = "demo-faculty@cloie.test";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const DEMO_PROJECT_REF = "demoprojectref";
const PRIMARY_PROJECT_REF = "primaryprojectref";

describe("dedicated demo authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CLOIE_DEMO_ENABLED", "true");
    vi.stubEnv("CLOIE_DEPLOYMENT_KIND", DEMO_DEPLOYMENT_KIND);
    vi.stubEnv("CLOIE_DEMO_SESSION_SECRET", SECRET);
    vi.stubEnv("CLOIE_DEMO_ALLOWED_USERS", USER_EMAIL);
    vi.stubEnv("CLOIE_DEMO_SUPABASE_PROJECT_REF", DEMO_PROJECT_REF);
    vi.stubEnv("CLOIE_PRIMARY_SUPABASE_PROJECT_REF", PRIMARY_PROJECT_REF);
    vi.stubEnv("SUPABASE_PROJECT_REF", DEMO_PROJECT_REF);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", `https://${DEMO_PROJECT_REF}.supabase.co`);
    vi.stubEnv(
      "DATABASE_URL",
      `postgresql://postgres.${DEMO_PROJECT_REF}:secret@aws-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
    );
  });

  it("fails closed when disabled, incomplete, or attached to primary Production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(getDemoAuthConfig()).toBeNull();

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CLOIE_DEMO_ENABLED", "false");
    expect(getDemoAuthConfig()).toBeNull();

    vi.stubEnv("CLOIE_DEMO_ENABLED", "true");
    vi.stubEnv("CLOIE_DEMO_SESSION_SECRET", "short");
    expect(getDemoAuthConfig()).toBeNull();

    vi.stubEnv("CLOIE_DEMO_SESSION_SECRET", SECRET);
    vi.stubEnv("CLOIE_DEPLOYMENT_KIND", "production");
    expect(getDemoAuthConfig()).toBeNull();

    vi.stubEnv("CLOIE_DEPLOYMENT_KIND", DEMO_DEPLOYMENT_KIND);
    vi.stubEnv("SUPABASE_PROJECT_REF", PRIMARY_PROJECT_REF);
    expect(getDemoAuthConfig()).toBeNull();

    vi.stubEnv("SUPABASE_PROJECT_REF", DEMO_PROJECT_REF);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", `https://${PRIMARY_PROJECT_REF}.supabase.co`);
    expect(getDemoAuthConfig()).toBeNull();

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", `https://${DEMO_PROJECT_REF}.supabase.co`);
    vi.stubEnv(
      "DATABASE_URL",
      `postgresql://postgres.${PRIMARY_PROJECT_REF}:secret@aws-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
    );
    expect(getDemoAuthConfig()).toBeNull();
  });

  it("rejects an empty or non-seeded allowlist", () => {
    vi.stubEnv("CLOIE_DEMO_ALLOWED_USERS", "");
    expect(getDemoAuthConfig()).toBeNull();

    vi.stubEnv("CLOIE_DEMO_ALLOWED_USERS", "person@example.com");
    expect(getDemoAuthConfig()).toBeNull();
  });

  it("creates and verifies a short-lived signed session", () => {
    const value = createDemoSessionValue(USER_ID, 1_000);
    const encodedPayload = value.split(".")[0];
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));

    expect(Object.keys(payload).sort()).toEqual(["expiresAt", "issuedAt", "userId"]);

    expect(verifyDemoSessionValue(value, 1_001)).toEqual({
      userId: USER_ID,
      issuedAt: 1_000,
      expiresAt: 1_000 + 60 * 60,
    });
  });

  it("rejects forged, malformed, expired, and future-issued sessions", () => {
    const value = createDemoSessionValue(USER_ID, 1_000);
    const [payload, signature] = value.split(".");

    expect(verifyDemoSessionValue(`${payload}.${signature.slice(0, -1)}x`, 1_001)).toBeNull();
    expect(verifyDemoSessionValue("not-a-session", 1_001)).toBeNull();
    expect(verifyDemoSessionValue(value, 1_000 + 60 * 60)).toBeNull();
    expect(
      verifyDemoSessionValue(createDemoSessionValue(USER_ID, 1_000 + 60 + 1), 1_000)
    ).toBeNull();
  });

  it("reads only the separate dedicated-demo cookie", async () => {
    getCookieMock.mockReturnValue({
      value: createDemoSessionValue(USER_ID, Math.floor(Date.now() / 1000)),
    });

    await expect(readDemoAuthCookie()).resolves.toEqual({ userId: USER_ID });
    expect(getCookieMock).toHaveBeenCalledWith(DEMO_AUTH_COOKIE_NAME);
    expect(getDemoCookieOptions()).toMatchObject({
      httpOnly: true,
      maxAge: 60 * 60,
      path: "/",
      sameSite: "lax",
      secure: true,
    });
  });

  it("does not read the cookie when the deployment configuration is disabled", async () => {
    vi.stubEnv("CLOIE_DEMO_ENABLED", "false");

    await expect(readDemoAuthCookie()).resolves.toBeNull();
    expect(getCookieMock).not.toHaveBeenCalled();
  });
});
