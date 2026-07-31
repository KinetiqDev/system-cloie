import { describe, expect, it, vi } from "vitest";
import { resetDemoDatabase, validateDemoResetTarget } from "../../../scripts/reset-demo-database";

const DEMO_PROJECT_REF = "demoprojectref";
const PRIMARY_PROJECT_REF = "primaryprojectref";

function createEnvironment(overrides: Record<string, string | undefined> = {}) {
  return {
    CLOIE_DEPLOYMENT_KIND: "dedicated-demo",
    CLOIE_DEMO_ENABLED: "true",
    CLOIE_DEMO_SESSION_SECRET: "a".repeat(32),
    CLOIE_DEMO_ALLOWED_USERS: "demo-faculty@cloie.test",
    CLOIE_DEMO_SUPABASE_PROJECT_REF: DEMO_PROJECT_REF,
    CLOIE_PRIMARY_SUPABASE_PROJECT_REF: PRIMARY_PROJECT_REF,
    SUPABASE_PROJECT_REF: DEMO_PROJECT_REF,
    NEXT_PUBLIC_SUPABASE_URL: `https://${DEMO_PROJECT_REF}.supabase.co`,
    DATABASE_URL: `postgresql://postgres.${DEMO_PROJECT_REF}:secret@aws-1.pooler.supabase.com:6543/postgres?pgbouncer=true`,
    DIRECT_URL: `postgresql://postgres.${DEMO_PROJECT_REF}:secret@aws-1.pooler.supabase.com:5432/postgres`,
    NODE_ENV: "production",
    ...overrides,
  };
}

describe("dedicated demo database reset", () => {
  it("requires every configured target identifier to agree on the dedicated demo project", () => {
    expect(validateDemoResetTarget(createEnvironment()).valid).toBe(true);

    const result = validateDemoResetTarget(
      createEnvironment({
        DIRECT_URL: "postgresql://postgres.otherproject:secret@db.example.test:5432/postgres",
      })
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "DIRECT_URL must identify the configured dedicated demo project."
    );
  });

  it("rejects a configured primary project identity", () => {
    const result = validateDemoResetTarget(
      createEnvironment({ CLOIE_DEMO_SUPABASE_PROJECT_REF: PRIMARY_PROJECT_REF })
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "The dedicated demo and primary Production project references must differ."
    );
  });

  it("does not run Prisma commands when isolation validation fails", () => {
    const runCommand = vi.fn();

    expect(() =>
      resetDemoDatabase(
        createEnvironment({ SUPABASE_PROJECT_REF: PRIMARY_PROJECT_REF }),
        runCommand
      )
    ).toThrow("Demo target isolation FAILED");

    expect(runCommand).not.toHaveBeenCalled();
  });

  it("does not trust a demo-looking database username on an arbitrary host", () => {
    const runCommand = vi.fn();

    expect(() =>
      resetDemoDatabase(
        createEnvironment({
          DATABASE_URL: "postgresql://postgres.demoprojectref:secret@db.example.test:5432/postgres",
          DIRECT_URL: "postgresql://postgres.demoprojectref:secret@db.example.test:5432/postgres",
        }),
        runCommand
      )
    ).toThrow("Demo target isolation FAILED");

    expect(runCommand).not.toHaveBeenCalled();
  });

  it("force-resets the validated demo target before generating and seeding fixtures", () => {
    const runCommand = vi.fn();

    resetDemoDatabase(createEnvironment(), runCommand);

    expect(runCommand.mock.calls).toEqual([
      ["prisma", ["db", "push", "--schema", "prisma", "--force-reset", "--accept-data-loss"]],
      ["prisma", ["generate", "--schema", "prisma"]],
      ["prisma", ["db", "seed"]],
    ]);
  });
});
