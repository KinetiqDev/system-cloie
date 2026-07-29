import { describe, expect, it } from "vitest";
import { validateDemoTargetIsolation } from "../../../scripts/validate-demo-target-isolation";

const DEMO_SECRET = "a".repeat(32);

describe("demo target isolation validation", () => {
  it("passes for a valid dedicated demo configuration", () => {
    const result = validateDemoTargetIsolation({
      CLOIE_DEPLOYMENT_KIND: "dedicated-demo",
      CLOIE_DEMO_ENABLED: "true",
      CLOIE_DEMO_SESSION_SECRET: DEMO_SECRET,
      CLOIE_DEMO_ALLOWED_USERS: "demo-faculty@cloie.test",
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://localhost:5432/demo_cloie",
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("fails when deployment kind is primary production", () => {
    const result = validateDemoTargetIsolation({
      CLOIE_DEPLOYMENT_KIND: "production",
      CLOIE_DEMO_ENABLED: "true",
      CLOIE_DEMO_SESSION_SECRET: DEMO_SECRET,
      CLOIE_DEMO_ALLOWED_USERS: "demo-faculty@cloie.test",
      NODE_ENV: "production",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("CLOIE_DEPLOYMENT_KIND"))).toBe(true);
  });

  it("fails when demo is disabled", () => {
    const result = validateDemoTargetIsolation({
      CLOIE_DEPLOYMENT_KIND: "dedicated-demo",
      CLOIE_DEMO_ENABLED: "false",
      CLOIE_DEMO_SESSION_SECRET: DEMO_SECRET,
      CLOIE_DEMO_ALLOWED_USERS: "demo-faculty@cloie.test",
      NODE_ENV: "production",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("CLOIE_DEMO_ENABLED"))).toBe(true);
  });

  it("fails when session secret is too short", () => {
    const result = validateDemoTargetIsolation({
      CLOIE_DEPLOYMENT_KIND: "dedicated-demo",
      CLOIE_DEMO_ENABLED: "true",
      CLOIE_DEMO_SESSION_SECRET: "short",
      CLOIE_DEMO_ALLOWED_USERS: "demo-faculty@cloie.test",
      NODE_ENV: "production",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("CLOIE_DEMO_SESSION_SECRET"))).toBe(true);
  });

  it("fails when allowlist is empty", () => {
    const result = validateDemoTargetIsolation({
      CLOIE_DEPLOYMENT_KIND: "dedicated-demo",
      CLOIE_DEMO_ENABLED: "true",
      CLOIE_DEMO_SESSION_SECRET: DEMO_SECRET,
      CLOIE_DEMO_ALLOWED_USERS: "",
      NODE_ENV: "production",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("CLOIE_DEMO_ALLOWED_USERS"))).toBe(true);
  });

  it("errors when DATABASE_URL looks like production", () => {
    const result = validateDemoTargetIsolation({
      CLOIE_DEPLOYMENT_KIND: "dedicated-demo",
      CLOIE_DEMO_ENABLED: "true",
      CLOIE_DEMO_SESSION_SECRET: DEMO_SECRET,
      CLOIE_DEMO_ALLOWED_USERS: "demo-faculty@cloie.test",
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://host.supabase.co:5432/postgres?ref=production",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("production-like"))).toBe(true);
  });

  it("fails with multiple errors when several conditions are invalid", () => {
    const result = validateDemoTargetIsolation({
      CLOIE_DEPLOYMENT_KIND: "production",
      CLOIE_DEMO_ENABLED: "false",
      CLOIE_DEMO_SESSION_SECRET: "",
      CLOIE_DEMO_ALLOWED_USERS: "",
      NODE_ENV: "development",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(5);
  });

  it("detects unset environment variables", () => {
    const result = validateDemoTargetIsolation({});

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });
});
