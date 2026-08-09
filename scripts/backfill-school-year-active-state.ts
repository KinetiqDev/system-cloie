#!/usr/bin/env tsx
/**
 * Backfill School Year active state from the current ACTIVE AcademicTermInstance.
 *
 * The one-active-school-year partial unique index allows at most one active
 * School Year. This script derives the active state from the single ACTIVE
 * AcademicTermInstance (the partial unique index on term status guarantees at
 * most one) and makes that period's School Year the only active one:
 *
 *   1. no ACTIVE period exists  -> leave every School Year untouched
 *   2. ACTIVE period exists     -> clear active state on all School Years, then
 *      activate the period's School Year with the period's semester
 *
 * Run with: pnpm exec tsx scripts/backfill-school-year-active-state.ts
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { prisma } from "../src/lib/db/prisma";

async function main(): Promise<void> {
  const activePeriod = await prisma.academicTermInstance.findFirst({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      semester: true,
      school_year_id: true,
      school_year: { select: { code: true, is_active: true, active_semester: true } },
    },
  });

  if (!activePeriod) {
    console.log("No ACTIVE academic period exists; leaving School Year active state untouched.");
    return;
  }

  const { school_year: schoolYear } = activePeriod;
  if (schoolYear.is_active && schoolYear.active_semester === activePeriod.semester) {
    console.log(
      `School Year ${schoolYear.code} is already active with semester ${activePeriod.semester}; nothing to do.`
    );
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.schoolYear.updateMany({
      where: { is_active: true },
      data: {
        is_active: false,
        active_semester: null,
        active_semester_activated_by: null,
        active_semester_activated_at: null,
      },
    });

    await tx.schoolYear.update({
      where: { id: activePeriod.school_year_id },
      data: {
        is_active: true,
        active_semester: activePeriod.semester,
        active_semester_activated_at: new Date(),
      },
    });
  });

  console.log(
    `Activated School Year ${schoolYear.code} (${activePeriod.school_year_id}) ` +
      `with active semester ${activePeriod.semester} from ACTIVE period ${activePeriod.id}.`
  );
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
