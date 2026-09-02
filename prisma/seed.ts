import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { prisma } from "../src/lib/db/prisma";
import { persistPeriodReadinessSnapshot } from "../src/features/academic-calendar/services/read-period-readiness";
import { seedAcademicCalendar as seedAcademicCalendarRunner } from "./seed/runners/seed-academic-calendar";
import { seedCourseAssignments as seedCourseAssignmentsRunner } from "./seed/runners/seed-course-assignments";
import { seedEvaluations as seedEvaluationsRunner } from "./seed/runners/seed-evaluations";
import { seedFacultyPublicationTemplate } from "./seed/runners/seed-faculty-publication-template";
import { seedFoundation as seedFoundationRunner } from "./seed/runners/seed-foundation";
import { seedInstruments } from "./seed/runners/seed-instruments";
import { seedOutcomes as seedOutcomesRunner } from "./seed/runners/seed-outcomes";
import { seedResponses as seedResponsesRunner } from "./seed/runners/seed-responses";
import { seedUsers as seedUsersRunner } from "./seed/runners/seed-users";

// ═══════════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("🌱 Seeding CLOIE database...\n");

  console.log("[A] Foundation data...");
  const { pMap, mMap, cMap } = await seedFoundationRunner();

  console.log("[A.5] Academic calendar...");
  const { termInstance, termInstances } = await seedAcademicCalendarRunner();

  console.log("[B] Users & roles...");
  await seedUsersRunner({ pMap, mMap }, termInstance.id);

  console.log("[B.5] Course assignments...");
  const { assignmentMap } = await seedCourseAssignmentsRunner({ pMap, cMap }, termInstance.id);

  console.log("[C] Outcomes (GOs, CILOs, mappings)...");
  const outcomeContext = await seedOutcomesRunner({ pMap, cMap });
  await persistPeriodReadinessSnapshot(termInstances.ti2026First.id);

  console.log("[D] Instrument templates...");
  await seedInstruments();
  await seedFacultyPublicationTemplate({ cMap });

  console.log("[E] Evaluations & deployments...");
  const evaluationContext = await seedEvaluationsRunner(
    { pMap, cMap },
    outcomeContext.ciloMap,
    termInstance.id,
    {
      assignmentMap,
    }
  );

  console.log("[F] Responses with items...");
  await seedResponsesRunner(evaluationContext);

  console.log("\n✅ Seed complete!");
}

if (!process.env.VITEST) {
  main()
    .catch((e) => {
      console.error("❌ Seed failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
