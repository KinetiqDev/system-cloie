import { pathToFileURL } from "node:url";
import { loadEnvConfig } from "@next/env";

import {
  checkTableAccessDispositions,
  listPrismaTableNames,
} from "../src/lib/db/table-access-dispositions";

loadEnvConfig(process.cwd());

function main(): void {
  const tables = listPrismaTableNames(process.cwd());
  const result = checkTableAccessDispositions(tables);

  console.log(`Parsed ${tables.length} Prisma-backed application tables.`);

  if (!result.ok) {
    console.error("Table access disposition verification FAILED:");
    for (const err of result.errors) console.error(`  - ${err}`);
    console.error(
      "\nFix: give every Prisma-backed table exactly one disposition in src/lib/db/table-access-dispositions.ts."
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    "Table access disposition verification OK — every table has exactly one disposition."
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
