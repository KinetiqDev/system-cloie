/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn() })),
}));

import { DEMO_DEPLOYMENT_KIND } from "@/features/auth/services/demo-auth";
import { resolveAppearanceAvailability } from "@/features/design-system/services/resolve-appearance-availability";

const SECRET = "a".repeat(32);
const USER_EMAIL = "demo-faculty@cloie.test";
const DEMO_PROJECT_REF = "demoprojectref";
const PRIMARY_PROJECT_REF = "primaryprojectref";

function stubValidDedicatedDemoEnvironment() {
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
  vi.stubEnv("CLOIE_APPEARANCE_ENABLED", "");
}

describe("resolveAppearanceAvailability", () => {
  beforeEach(() => {
    stubValidDedicatedDemoEnvironment();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is enabled in development regardless of the release setting", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(resolveAppearanceAvailability()).toBe(true);
  });

  it("is enabled for a valid dedicated demo deployment", () => {
    expect(resolveAppearanceAvailability()).toBe(true);
  });

  it("fails closed for a malformed dedicated demo deployment", () => {
    vi.stubEnv("CLOIE_DEMO_ENABLED", "false");
    expect(resolveAppearanceAvailability()).toBe(false);

    vi.stubEnv("CLOIE_DEMO_ENABLED", "true");
    vi.stubEnv("SUPABASE_PROJECT_REF", PRIMARY_PROJECT_REF);
    expect(resolveAppearanceAvailability()).toBe(false);
  });

  it("does not fall through to the release setting when the demo deployment is malformed", () => {
    vi.stubEnv("CLOIE_DEMO_ENABLED", "false");
    vi.stubEnv("CLOIE_APPEARANCE_ENABLED", "true");
    expect(resolveAppearanceAvailability()).toBe(false);
  });

  it("enables primary Production only when the release setting is exactly true", () => {
    vi.stubEnv("CLOIE_DEPLOYMENT_KIND", "production");
    vi.stubEnv("CLOIE_APPEARANCE_ENABLED", "true");
    expect(resolveAppearanceAvailability()).toBe(true);
  });

  it("keeps primary Production disabled for unset, empty, false, and malformed release values", () => {
    vi.stubEnv("CLOIE_DEPLOYMENT_KIND", "production");

    vi.stubEnv("CLOIE_APPEARANCE_ENABLED", "");
    expect(resolveAppearanceAvailability()).toBe(false);

    vi.stubEnv("CLOIE_APPEARANCE_ENABLED", "false");
    expect(resolveAppearanceAvailability()).toBe(false);

    vi.stubEnv("CLOIE_APPEARANCE_ENABLED", "TRUE");
    expect(resolveAppearanceAvailability()).toBe(false);

    vi.stubEnv("CLOIE_APPEARANCE_ENABLED", " true");
    expect(resolveAppearanceAvailability()).toBe(false);

    vi.stubEnv("CLOIE_APPEARANCE_ENABLED", "enabled");
    expect(resolveAppearanceAvailability()).toBe(false);

    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "production");
    expect(resolveAppearanceAvailability()).toBe(false);
  });
});
