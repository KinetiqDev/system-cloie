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
const DEMO_BACKEND_ID = "demo-backend-id";
const PRIMARY_BACKEND_ID = "primary-backend-id";

function stubValidDedicatedDemoEnvironment() {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("CLOIE_DEMO_ENABLED", "true");
  vi.stubEnv("CLOIE_DEPLOYMENT_KIND", DEMO_DEPLOYMENT_KIND);
  vi.stubEnv("CLOIE_DEMO_SESSION_SECRET", SECRET);
  vi.stubEnv("CLOIE_DEMO_ALLOWED_USERS", USER_EMAIL);
  vi.stubEnv("CLOIE_BACKEND_ID", DEMO_BACKEND_ID);
  vi.stubEnv("CLOIE_DEMO_BACKEND_ID", DEMO_BACKEND_ID);
  vi.stubEnv("CLOIE_PRIMARY_BACKEND_ID", PRIMARY_BACKEND_ID);
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
    vi.stubEnv("CLOIE_BACKEND_ID", PRIMARY_BACKEND_ID);
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
    // Environment isolation: unstubAllEnvs may leave previously stubbed
    // dedicated-demo keys in process.env (Vitest 4 stub-restore quirk), so
    // explicitly unset every key the resolution branch reads before the
    // unset assertion.
    delete process.env.CLOIE_DEMO_ENABLED;
    delete process.env.CLOIE_DEPLOYMENT_KIND;
    delete process.env.CLOIE_DEMO_SESSION_SECRET;
    delete process.env.CLOIE_DEMO_ALLOWED_USERS;
    delete process.env.CLOIE_BACKEND_ID;
    delete process.env.CLOIE_DEMO_BACKEND_ID;
    delete process.env.CLOIE_PRIMARY_BACKEND_ID;
    delete process.env.CLOIE_APPEARANCE_ENABLED;
    expect(resolveAppearanceAvailability()).toBe(false);
  });
});
