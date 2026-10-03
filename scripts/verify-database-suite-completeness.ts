import { pathToFileURL } from "node:url";
import { loadEnvConfig } from "@next/env";
import { getDatabaseSuiteCompleteness } from "./lib/database-suite-discovery";

loadEnvConfig(process.cwd());

const MIN_SUITE_COUNT = 9;
const REQUIRED_SUITES = [
  "src/__tests__/features/course-assignments/course-seed-provenance-schema.test.ts",
];

type CompletenessFailure = {
  headline: string;
  items: string[];
  hint?: string;
};

/**
 * Single source of truth for the completeness verdict. Orphaned gated suites
 * fail first, then the minimum-count warning, then the required-suite check —
 * the order the CLI reports them in.
 */
export function evaluateCompleteness(
  suites: string[],
  orphans: string[]
): { warnings: string[]; failure: CompletenessFailure | null } {
  if (orphans.length > 0) {
    return {
      warnings: [],
      failure: {
        headline:
          "Database suite completeness FAILED — gated suites fall outside the database command convention:",
        items: orphans,
        hint: '\nFix: ensure the suite is gated with describe.skipIf(!process.env.DATABASE_URL || process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1") so it is discovered by the repository convention.',
      },
    };
  }

  const warnings =
    suites.length < MIN_SUITE_COUNT
      ? [
          `Completeness warning: expected at least ${MIN_SUITE_COUNT} database suites, got ${suites.length}.`,
        ]
      : [];

  const missing = REQUIRED_SUITES.filter((f) => !suites.includes(f));
  if (missing.length > 0) {
    return {
      warnings,
      failure: {
        headline: "Completeness FAILED — required suites not discovered:",
        items: missing,
      },
    };
  }

  return { warnings, failure: null };
}

function main(): void {
  const { suites, gatedFiles, orphans } = getDatabaseSuiteCompleteness(process.cwd());

  console.log(
    `Discovered ${suites.length} suites via convention (describe.skipIf + RUN_DATABASE_INTEGRATION_TESTS).`
  );
  console.log(
    `Found ${gatedFiles.length} gated files mentioning RUN_DATABASE_INTEGRATION_TESTS (excluding meta/config).`
  );

  const { warnings, failure } = evaluateCompleteness(suites, orphans);

  for (const warning of warnings) console.error(warning);

  if (failure) {
    console.error(failure.headline);
    for (const item of failure.items) console.error(`  - ${item}`);
    if (failure.hint) console.error(failure.hint);
    process.exitCode = 1;
    return;
  }

  console.log("Database suite completeness OK.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
