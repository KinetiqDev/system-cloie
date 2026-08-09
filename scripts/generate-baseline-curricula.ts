#!/usr/bin/env tsx

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { prisma } from "../src/lib/db/prisma";
import { generateBaselineCurricula } from "../src/features/curriculum/services/generate-baseline";

async function main(): Promise<void> {
  const result = await generateBaselineCurricula();
  console.log(
    `Baseline generation complete: ${result.created} created, ` +
      `${result.skippedPrograms} programs skipped, ${result.skippedCourses} courses skipped.`
  );
}

main()
  .catch((error) => {
    console.error("Baseline generation failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
