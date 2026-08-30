import { describe, expect, it } from "vitest";
import { validateDemoTargetIsolation } from "../../../scripts/validate-demo-target-isolation";

const DEMO_SECRET = "a".repeat(32);
const DEMO_BACKEND_ID = "demo-backend-id";
const PRIMARY_BACKEND_ID = "primary-backend-id";

function dedicatedDemoEnvironment(overrides: Record<string, string | undefined> = {}) {
  return {
    CLOIE_DEPLOYMENT_KIND: "dedicated-demo",
    CLOIE_DEMO_ENABLED: "true",
    CLOIE_DEMO_SESSION_SECRET: DEMO_SECRET,
    CLOIE_DEMO_ALLOWED_USERS: "demo-faculty@cloie.test",
    CLOIE_BACKEND_ID: DEMO_BACKEND_ID,
    CLOIE_DEMO_BACKEND_ID: DEMO_BACKEND_ID,
    CLOIE_PRIMARY_BACKEND_ID: PRIMARY_BACKEND_ID,
    CLOIE_DEMO_DATABASE_ID: "demo-database-id",
    NEXT_PUBLIC_SUPABASE_URL: "https://demo.cloie.example.test",
    DATABASE_URL: "postgresql://postgres:secret@db-demo.cloie.example.test:5432/postgres",
    DIRECT_URL: "postgresql://postgres:secret@db-demo.cloie.example.test:5432/postgres",
    NODE_ENV: "production",
    ...overrides,
  };
}

describe("demo target isolation validation", () => {
  it("passes for a valid dedicated demo configuration with custom self-hosted URLs", () => {
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

  it("fails when the running backend identity is primary Production", () => {
    const result = validateDemoTargetIsolation(
      dedicatedDemoEnvironment({ CLOIE_BACKEND_ID: PRIMARY_BACKEND_ID })
    );

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("CLOIE_BACKEND_ID"))).toBe(true);
  });

  it("fails when the running backend identity differs from the demo identity", () => {
    const result = validateDemoTargetIsolation(
      dedicatedDemoEnvironment({ CLOIE_BACKEND_ID: "some-other-backend" })
    );

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("CLOIE_BACKEND_ID"))).toBe(true);
  });

  it("rejects a demo identity colliding with primary Production", () => {
    const result = validateDemoTargetIsolation(
      dedicatedDemoEnvironment({ CLOIE_DEMO_BACKEND_ID: PRIMARY_BACKEND_ID })
    );

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("backend identities must differ"))).toBe(true);
  });

  it("fails closed when the running backend identity is missing", () => {
    const result = validateDemoTargetIsolation(
      dedicatedDemoEnvironment({ CLOIE_BACKEND_ID: undefined })
    );

    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes("CLOIE_BACKEND_ID must identify the running backend"))
    ).toBe(true);
  });

  it("fails closed when the running backend identity is malformed", () => {
    const result = validateDemoTargetIsolation(
      dedicatedDemoEnvironment({ CLOIE_BACKEND_ID: "has space" })
    );

    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes("CLOIE_BACKEND_ID must identify the running backend"))
    ).toBe(true);
  });

  it("fails closed when the demo backend identity is missing", () => {
    const result = validateDemoTargetIsolation(
      dedicatedDemoEnvironment({ CLOIE_DEMO_BACKEND_ID: "" })
    );

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("CLOIE_DEMO_BACKEND_ID must identify"))).toBe(true);
  });

  it("fails closed when the primary backend identity is missing", () => {
    const result = validateDemoTargetIsolation(
      dedicatedDemoEnvironment({ CLOIE_PRIMARY_BACKEND_ID: undefined })
    );

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("CLOIE_PRIMARY_BACKEND_ID must identify"))).toBe(
      true
    );
  });

  it("rejects malformed identities without producing mismatch errors", () => {
    const result = validateDemoTargetIsolation(
      dedicatedDemoEnvironment({
        CLOIE_BACKEND_ID: "bad id",
        CLOIE_DEMO_BACKEND_ID: 'quote"id',
        CLOIE_PRIMARY_BACKEND_ID: "",
      })
    );

    expect(result.valid).toBe(false);
    expect(result.errors.filter((e) => e.includes("must identify")).length).toBe(3);
    expect(
      result.errors.some((e) => e.includes("expected the dedicated demo backend identity"))
    ).toBe(false);
    expect(result.errors.some((e) => e.includes("identities must differ"))).toBe(false);
  });

  it("accepts backend identities using the full allowed charset", () => {
    const result = validateDemoTargetIsolation(
      dedicatedDemoEnvironment({
        CLOIE_BACKEND_ID: "cloie-demo.01-backend",
        CLOIE_DEMO_BACKEND_ID: "cloie-demo.01-backend",
      })
    );

    expect(result.valid).toBe(true);
  });

  it("rejects a missing demo database identity", () => {
    const result = validateDemoTargetIsolation(
      dedicatedDemoEnvironment({ CLOIE_DEMO_DATABASE_ID: "" })
    );

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes("CLOIE_DEMO_DATABASE_ID"))).toBe(true);
  });

  it("accepts arbitrary custom self-hosted URLs without hostname heuristics", () => {
    const result = validateDemoTargetIsolation(
      dedicatedDemoEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "https://supabase.internal.cloie.test:8443",
        DATABASE_URL: "postgresql://postgres:secret@supabase-db:5432/postgres",
        DIRECT_URL: "postgresql://postgres:secret@supabase-db:5432/postgres",
      })
    );

    expect(result.valid).toBe(true);
  });

  it("fails when URL/database evidence is missing", () => {
    const result = validateDemoTargetIsolation(
      dedicatedDemoEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "",
        DIRECT_URL: undefined,
      })
    );

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("NEXT_PUBLIC_SUPABASE_URL"))).toBe(true);
    expect(result.errors.some((e) => e.includes("DIRECT_URL"))).toBe(true);
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
