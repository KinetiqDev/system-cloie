import { pathToFileURL } from "node:url";
import { loadEnvConfig } from "@next/env";
import { verifyDisposableDatabaseTarget } from "../src/lib/db/verify-database-target";

loadEnvConfig(process.cwd());

function redactDatabaseUrl(url: string | undefined): string {
  if (!url) return "<unset>";
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}${parsed.pathname}`;
  } catch {
    return "<invalid-url>";
  }
}

function main(): void {
  const result = verifyDisposableDatabaseTarget(process.env);
  if (!result.valid) {
    console.error("Disposable database target validation FAILED:");
    for (const err of result.errors) console.error(`  - ${err}`);
    process.exitCode = 1;
    return;
  }
  console.log("Disposable database target OK:", redactDatabaseUrl(process.env.DATABASE_URL));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
