import { prisma } from "../../../src/lib/db/prisma";
import { courseDefinitions, majorDefinitions, programDefinitions } from "../fixtures/academic-structure";
import type { CourseSeed, FoundationContext, MajorSeed, ProgramSeed } from "../types";

const ACD_DEMO_CATALOG_SEED_SOURCE = "ACD_DEMO_CATALOG";

export async function seedFoundation(): Promise<FoundationContext> {
  const courseCodes = courseDefinitions.map((d) => d.code);
  const unprovenancedCourses = await prisma.course.findMany({
    where: {
      code: { in: courseCodes },
      OR: [
        { seed_source: null },
        { seed_source: { not: ACD_DEMO_CATALOG_SEED_SOURCE } },
      ],
    },
    select: { code: true },
  });
  if (unprovenancedCourses.length > 0) {
    const codes = unprovenancedCourses.map((course) => course.code).join(", ");
    throw new Error(`Cannot reconcile catalog; unprovenanced course code collision: ${codes}`);
  }

  console.log("  → Programs...");
  const pMap = new Map<string, ProgramSeed>();
  for (const d of programDefinitions) {
    const p = await prisma.program.upsert({
      where: { code: d.code },
      update: {
        name: d.name,
        description: `${d.name} — seeded from ACD academic catalog.`,
        is_active: true,
      },
      create: {
        code: d.code,
        name: d.name,
        description: `${d.name} — seeded from ACD academic catalog.`,
        is_active: true,
      },
    });
    pMap.set(d.code, p);
  }

  console.log("  → Majors...");
  const mMap = new Map<string, MajorSeed>();
  for (const d of majorDefinitions) {
    const prog = pMap.get(d.pc)!;
    const m = await prisma.major.upsert({
      where: { program_id_name: { name: d.name, program_id: prog.id } },
      update: { is_active: true },
      create: { name: d.name, program_id: prog.id },
    });
    mMap.set(`${d.pc}:${d.name}`, m);
  }

  console.log("  → Courses...");
  const cMap = new Map<string, CourseSeed>();
  for (const d of courseDefinitions) {
    const c = await prisma.course.upsert({
      where: { code: d.code },
      update: {
        title: d.title,
        course_scope: d.scope,
        description: `${d.title} — seeded course.`,
        is_active: true,
        program_id: d.pc ? (pMap.get(d.pc)?.id ?? null) : null,
        major_id: d.mk ? (mMap.get(d.mk)?.id ?? null) : null,
        default_year_level: d.yl ?? null,
        default_semester: d.sem ?? null,
        default_term: d.trm ?? null,
      },
      create: {
        code: d.code,
        title: d.title,
        course_scope: d.scope,
        description: `${d.title} — seeded course.`,
        seed_source: ACD_DEMO_CATALOG_SEED_SOURCE,
        is_active: true,
        program_id: d.pc ? (pMap.get(d.pc)?.id ?? null) : null,
        major_id: d.mk ? (mMap.get(d.mk)?.id ?? null) : null,
        default_year_level: d.yl ?? null,
        default_semester: d.sem ?? null,
        default_term: d.trm ?? null,
      },
    });
    cMap.set(d.code, { id: c.id, code: c.code, title: c.title });
  }

  // Converge the catalog: deactivate seed-managed courses removed from the
  // fixture since the last run. User-authored course descriptions are ignored.
  await prisma.course.updateMany({
    where: {
      is_active: true,
      seed_source: ACD_DEMO_CATALOG_SEED_SOURCE,
      NOT: { code: { in: courseCodes } },
    },
    data: { is_active: false },
  });

  return { pMap, mMap, cMap };
}
