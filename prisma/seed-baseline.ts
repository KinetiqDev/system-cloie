import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { prisma } from "../src/lib/db/prisma";
import { seedFoundation } from "./seed/runners/seed-foundation";
import { seedAcademicCalendar } from "./seed/runners/seed-academic-calendar";
import { seedInstruments } from "./seed/runners/seed-instruments";

/**
 * Baseline seed: academic structure only.
 *
 * Seeds programs and majors, the course catalog, the two fixture school years
 * with their canonical term instances, and the four institutional evaluation
 * templates. Deliberately does not seed users, outcomes, course assignments,
 * evaluations, or responses.
 *
 * Standalone use: `tsx prisma/seed-baseline.ts` against a database whose
 * schema is already applied (idempotent upserts).
 */
export async function seedBaseline() {
  console.log("Seeding CLOIE baseline (structure only)...\n");

  console.log("[A] Programs, majors, courses...");
  const { pMap, mMap, cMap } = await seedFoundation();

  console.log("[B] School years and canonical term instances...");
  await seedAcademicCalendar();

  console.log("[C] Institutional evaluation templates...");
  await seedInstruments();

  console.log(
    `\nBaseline seed complete: ${pMap.size} programs, ${mMap.size} majors, ${cMap.size} courses.`
  );
}

if (!process.env.VITEST) {
  seedBaseline()
    .catch((e) => {
      console.error("Baseline seed failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
