/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCookieMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: getCookieMock })),
}));

import {
  CI_TEST_AUTH_COOKIE_NAME,
  createCiTestSessionValue,
  getCiTestAuthConfig,
  getCiTestCookieOptions,
  readCiTestAuthCookie,
  verifyCiTestSessionValue,
} from "@/features/auth/services/ci-test-auth";

const SECRET = "a".repeat(32);
const USER_EMAIL = "demo-ph@cloie.test";
const USER_ID = "11111111-1111-4111-8111-111111111111";

describe("isolated CI test authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CLOIE_CI_TEST_ENABLED", "true");
    vi.stubEnv("CLOIE_CI_TEST_SESSION_SECRET", SECRET);
    vi.stubEnv("CLOIE_CI_TEST_ALLOWED_USERS", USER_EMAIL);
    vi.stubEnv("CLOIE_DEPLOYMENT_KIND", "ci-test");
    vi.stubEnv("CI", "true");
    vi.stubEnv("GITHUB_ACTIONS", "");
    vi.stubEnv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cloie_test");
    vi.stubEnv("DIRECT_URL", "postgresql://postgres:postgres@localhost:5432/cloie_test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("CLOIE_DEMO_ENABLED", "");
    vi.stubEnv("CLOIE_PRIMARY_SUPABASE_PROJECT_REF", "");
    vi.stubEnv("CLOIE_DEMO_SUPABASE_PROJECT_REF", "");
    vi.stubEnv("SUPABASE_PROJECT_REF", "");
  });

  it("fails closed when disabled, incomplete, or attached to non-disposable target", () => {
    expect(getCiTestAuthConfig()).not.toBeNull();
    vi.stubEnv("CLOIE_CI_TEST_ENABLED", "false");
    expect(getCiTestAuthConfig()).toBeNull();

    vi.stubEnv("CLOIE_CI_TEST_ENABLED", "true");
    vi.stubEnv("CLOIE_DEPLOYMENT_KIND", "dedicated-demo");
    expect(getCiTestAuthConfig()).toBeNull();

    vi.stubEnv("CLOIE_DEPLOYMENT_KIND", "ci-test");
    vi.stubEnv("CLOIE_PRIMARY_SUPABASE_PROJECT_REF", "primary-ref");
    expect(getCiTestAuthConfig()).toBeNull();
    vi.stubEnv("CLOIE_PRIMARY_SUPABASE_PROJECT_REF", "");

    vi.stubEnv("CLOIE_DEMO_SUPABASE_PROJECT_REF", "demo-ref");
    expect(getCiTestAuthConfig()).toBeNull();
    vi.stubEnv("CLOIE_DEMO_SUPABASE_PROJECT_REF", "");

    vi.stubEnv("CI", "");
    vi.stubEnv("GITHUB_ACTIONS", "");
    expect(getCiTestAuthConfig()).toBeNull();
    vi.stubEnv("CI", "true");

    vi.stubEnv("CLOIE_CI_TEST_SESSION_SECRET", "short");
    expect(getCiTestAuthConfig()).toBeNull();

    vi.stubEnv("CLOIE_CI_TEST_SESSION_SECRET", SECRET);
    vi.stubEnv("DATABASE_URL", "postgresql://postgres:postgres@db.supabase.co:5432/postgres");
    expect(getCiTestAuthConfig()).toBeNull();

    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://postgres:postgres@localhost:5432/ordinary_primary_data"
    );
    expect(getCiTestAuthConfig()).toBeNull();

    vi.stubEnv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cloie_test");
    vi.stubEnv("NODE_ENV", "development");
    expect(getCiTestAuthConfig()).toBeNull();
  });

  it("rejects an empty or non-seeded allowlist", () => {
    vi.stubEnv("CLOIE_CI_TEST_ALLOWED_USERS", "");
    expect(getCiTestAuthConfig()).toBeNull();

    vi.stubEnv("CLOIE_CI_TEST_ALLOWED_USERS", "not-in-catalog@cloie.test");
    expect(getCiTestAuthConfig()).toBeNull();

    vi.stubEnv("CLOIE_CI_TEST_ALLOWED_USERS", `${USER_EMAIL},unknown@cloie.test`);
    expect(getCiTestAuthConfig()).toBeNull();
  });

  it("creates and verifies a short-lived signed session", () => {
    const session = createCiTestSessionValue(USER_ID);
    expect(session.split(".")).toHaveLength(2);
    const payload = verifyCiTestSessionValue(session);
    expect(payload?.userId).toBe(USER_ID);
  });

  it("rejects forged, malformed, expired, and future-issued sessions", () => {
    const valid = createCiTestSessionValue(USER_ID, 1_000);
    expect(verifyCiTestSessionValue(valid, 1_000 + 60)).not.toBeNull();
    // Forged signature
    expect(verifyCiTestSessionValue(`${valid}x`, 1_000 + 60)).toBeNull();
    // Malformed
    expect(verifyCiTestSessionValue("not-a-session", 1_000)).toBeNull();
    // Expired
    expect(verifyCiTestSessionValue(valid, 1_000 + 4_000)).toBeNull();
    // Future issued
    expect(verifyCiTestSessionValue(valid, 500)).toBeNull();
  });

  it("reads only the separate CI test cookie", async () => {
    const session = createCiTestSessionValue(USER_ID);
    getCookieMock.mockReturnValue({ value: session });
    const result = await readCiTestAuthCookie();
    expect(result?.userId).toBe(USER_ID);
    expect(getCookieMock).toHaveBeenCalled();
  });

  it("does not read the cookie when the deployment configuration is disabled", async () => {
    vi.stubEnv("CLOIE_CI_TEST_ENABLED", "false");
    getCookieMock.mockReturnValue({ value: "any" });
    const result = await readCiTestAuthCookie();
    expect(result).toBeNull();
  });

  it("exposes CI test cookie options as httpOnly, lax, and production-secure", () => {
    const options = getCiTestCookieOptions();
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  it("does not allow non-disposable Supabase URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://demoprojectref.supabase.co");
    expect(getCiTestAuthConfig()).toBeNull();
  });
});
