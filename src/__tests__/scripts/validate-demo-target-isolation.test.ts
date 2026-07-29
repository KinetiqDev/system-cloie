import { describe, expect, it } from "vitest";
import { validateDemoTargetIsolation } from "../../../scripts/validate-demo-target-isolation";

const DEMO_SECRET = "a".repeat(32);

function dedicatedDemoEnvironment(overrides: Record<string, string | undefined> = {}) {
  const projectRef = "demoprojectref";
  return {
    CLOIE_DEPLOYMENT_KIND: "dedicated-demo",
    CLOIE_DEMO_ENABLED: "true",
    CLOIE_DEMO_SESSION_SECRET: DEMO_SECRET,
    CLOIE_DEMO_ALLOWED_USERS: "demo-faculty@cloie.test",
    CLOIE_DEMO_SUPABASE_PROJECT_REF: projectRef,
    CLOIE_PRIMARY_SUPABASE_PROJECT_REF: "primaryprojectref",
    SUPABASE_PROJECT_REF: projectRef,
    NEXT_PUBLIC_SUPABASE_URL: `https://${projectRef}.supabase.co`,
    DATABASE_URL: `postgresql://postgres.${projectRef}:secret@aws-1.pooler.supabase.com:6543/postgres?pgbouncer=true`,
    DIRECT_URL: `postgresql://postgres.${projectRef}:secret@aws-1.pooler.supabase.com:5432/postgres`,
    NODE_ENV: "production",
    ...overrides,
  };
}

describe("demo target isolation validation", () => {
  it("passes for a valid dedicated demo configuration", () => {
    const result = validateDemoTargetIsolation(dedicatedDemoEnvironment());

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("fails when deployment kind is primary production", () => {
    const result = validateDemoTargetIsolation(
      dedicatedDemoEnvironment({ CLOIE_DEPLOYMENT_KIND: "production" })
    );

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("CLOIE_DEPLOYMENT_KIND"))).toBe(true);
  });

  it("fails when demo is disabled", () => {
    const result = validateDemoTargetIsolation(
      dedicatedDemoEnvironment({ CLOIE_DEMO_ENABLED: "false" })
    );

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("CLOIE_DEMO_ENABLED"))).toBe(true);
  });

  it("fails when session secret is too short", () => {
    const result = validateDemoTargetIsolation(
      dedicatedDemoEnvironment({ CLOIE_DEMO_SESSION_SECRET: "short" })
    );

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("CLOIE_DEMO_SESSION_SECRET"))).toBe(true);
  });

  it("fails when allowlist is empty", () => {
    const result = validateDemoTargetIsolation(
      dedicatedDemoEnvironment({ CLOIE_DEMO_ALLOWED_USERS: "" })
    );

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("CLOIE_DEMO_ALLOWED_USERS"))).toBe(true);
  });

  it("errors when DATABASE_URL identifies the primary Production project", () => {
    const result = validateDemoTargetIsolation(
      dedicatedDemoEnvironment({
        DATABASE_URL:
          "postgresql://postgres.primaryprojectref:secret@aws-1.pooler.supabase.com:6543/postgres",
      })
    );

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("identifies the primary Production project"))).toBe(
      true
    );
  });

  it("accepts a standard direct Supabase connection URL", () => {
    const result = validateDemoTargetIsolation(
      dedicatedDemoEnvironment({
        DIRECT_URL: "postgresql://postgres:secret@db.demoprojectref.supabase.co:5432/postgres",
      })
    );

    expect(result.valid).toBe(true);
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
