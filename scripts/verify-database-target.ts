import { pathToFileURL } from "node:url";
import { loadEnvConfig } from "@next/env";
import { verifyDisposableDatabaseTarget } from "../src/lib/db/verify-database-target";

loadEnvConfig(process.cwd());

function main(): void {
  const result = verifyDisposableDatabaseTarget(process.env);
  if (!result.valid) {
    console.error("Disposable database target validation FAILED:");
    for (const err of result.errors) console.error(`  - ${err}`);
    process.exitCode = 1;
    return;
  }
  console.log("Disposable database target OK:", process.env.DATABASE_URL ?? "<unset>");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
