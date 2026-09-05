import { pathToFileURL } from "node:url";
import { loadEnvConfig } from "@next/env";
import { getDatabaseSuiteCompleteness } from "./lib/database-suite-discovery";

loadEnvConfig(process.cwd());

export function evaluateCompleteness(
  suites: string[],
  gatedFiles: string[],
  orphans: string[]
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (orphans.length > 0) {
    errors.push(`gated suites fall outside convention: ${orphans.join(", ")}`);
  }
  if (suites.length < 9) {
    // warning, not error
  }
  const mustInclude = [
    "src/__tests__/features/course-assignments/course-seed-provenance-schema.test.ts",
  ];
  const missing = mustInclude.filter((f) => !suites.includes(f));
  if (missing.length > 0) errors.push(`required suites missing: ${missing.join(", ")}`);
  return { ok: errors.length === 0, errors };
}

function main(): void {
  const { suites, gatedFiles, orphans } = getDatabaseSuiteCompleteness(process.cwd());

  console.log(
    `Discovered ${suites.length} suites via convention (describe.skipIf + RUN_DATABASE_INTEGRATION_TESTS).`
  );
  console.log(
    `Found ${gatedFiles.length} gated files mentioning RUN_DATABASE_INTEGRATION_TESTS (excluding meta/config).`
  );

  if (orphans.length > 0) {
    console.error(
      "Database suite completeness FAILED — gated suites fall outside the database command convention:"
    );
    for (const o of orphans) console.error(`  - ${o}`);
    console.error(
      '\nFix: ensure the suite is gated with describe.skipIf(!process.env.DATABASE_URL || process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1") so it is discovered by the repository convention.'
    );
    process.exitCode = 1;
    return;
  }

  if (suites.length < 9) {
    console.error(
      `Completeness warning: expected at least 9 database suites, got ${suites.length}.`
    );
  }

  const mustInclude = [
    "src/__tests__/features/course-assignments/course-seed-provenance-schema.test.ts",
  ];
  const missing = mustInclude.filter((f) => !suites.includes(f));
  if (missing.length > 0) {
    console.error("Completeness FAILED — required suites not discovered:");
    for (const m of missing) console.error(`  - ${m}`);
    process.exitCode = 1;
    return;
  }

  console.log("Database suite completeness OK.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
