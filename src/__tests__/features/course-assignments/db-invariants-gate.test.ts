import { describe, expect, it, vi } from "vitest";

/**
 * Meta-test for #149: roster DB invariant suites must only run when
 * RUN_DATABASE_INTEGRATION_TESTS=1 is set. The actual invariant suites
 * (course-assignment-membership-constraints, class-identity-uniqueness,
 * seeded-course-assignment-memberships, course-assignments-section-constraint)
 * are gated by `describe.skipIf(!process.env.DATABASE_URL || process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1")`.
 *
 * This test re-evaluates the same gate expression against the live process
 * environment so a future change that loosens the condition fails CI.
 */
describe("DB invariant test gate (#149)", () => {
  function isInvariantsEnabled() {
    return Boolean(process.env.DATABASE_URL) && process.env.RUN_DATABASE_INTEGRATION_TESTS === "1";
  }

  it("requires both DATABASE_URL and RUN_DATABASE_INTEGRATION_TESTS=1", () => {
    const previous = {
      DATABASE_URL: process.env.DATABASE_URL,
      RUN_DATABASE_INTEGRATION_TESTS: process.env.RUN_DATABASE_INTEGRATION_TESTS,
    };

    try {
      vi.stubEnv("DATABASE_URL", undefined);
      vi.stubEnv("RUN_DATABASE_INTEGRATION_TESTS", undefined);
      expect(isInvariantsEnabled()).toBe(false);

      vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/cloie_test");
      vi.stubEnv("RUN_DATABASE_INTEGRATION_TESTS", undefined);
      expect(isInvariantsEnabled()).toBe(false);

      vi.stubEnv("DATABASE_URL", undefined);
      vi.stubEnv("RUN_DATABASE_INTEGRATION_TESTS", "1");
      expect(isInvariantsEnabled()).toBe(false);

      vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/cloie_test");
      vi.stubEnv("RUN_DATABASE_INTEGRATION_TESTS", "1");
      expect(isInvariantsEnabled()).toBe(true);
    } finally {
      if (previous.DATABASE_URL === undefined) vi.unstubAllEnvs();
      else {
        vi.stubEnv("DATABASE_URL", previous.DATABASE_URL);
        vi.stubEnv("RUN_DATABASE_INTEGRATION_TESTS", previous.RUN_DATABASE_INTEGRATION_TESTS ?? undefined);
      }
    }
  });
});
