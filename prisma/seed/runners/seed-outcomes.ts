import { prisma } from "../../../src/lib/db/prisma";
import { ciloDefsIT, ciloDefsMKT, ciloDefsNewCourses, goDefs, iloDefs } from "../fixtures/outcomes";
import type { FoundationContext, OutcomeContext } from "../types";

export async function seedOutcomes({
  pMap,
  cMap,
}: Pick<FoundationContext, "pMap" | "cMap">): Promise<OutcomeContext> {
  console.log("  → Graduate Outcomes...");
  const goMap = new Map<string, { id: string }>();
  for (const g of goDefs) {
    const prog = pMap.get(g.pc)!;
    const go = await prisma.gO.upsert({
      where: { program_id_code: { program_id: prog.id, code: g.code } },
      update: { description: g.desc, is_active: true },
      create: { code: g.code, description: g.desc, program_id: prog.id },
    });
    goMap.set(g.code, go);
  }

  console.log("  → Institutional Outcomes...");
  for (const ilo of iloDefs) {
    await prisma.institutionalOutcome.upsert({
      where: { code: ilo.code },
      update: { description: ilo.description, order: ilo.order, is_active: true },
      create: {
        code: ilo.code,
        description: ilo.description,
        order: ilo.order,
        is_active: true,
      },
    });
  }

  // CILOs for courses with evaluations
  console.log("  → CILOs...");
  const ciloMap = new Map<string, { id: string; description: string; order: number }[]>();
  for (const cd of [...ciloDefsIT, ...ciloDefsMKT, ...ciloDefsNewCourses]) {
    const course = cMap.get(cd.courseCode)!;
    const existingCilo = await prisma.cILO.findFirst({
      where: { course_id: course.id, description: cd.desc },
    });
    const cilo = existingCilo
      ? await prisma.cILO.update({
          where: { id: existingCilo.id },
          data: { description: cd.desc, created_by: cd.createdBy },
        })
      : await prisma.cILO.create({
          data: { description: cd.desc, course_id: course.id, created_by: cd.createdBy },
        });
    if (!ciloMap.has(cd.courseCode)) ciloMap.set(cd.courseCode, []);
    ciloMap.get(cd.courseCode)!.push({ id: cilo.id, description: cd.desc, order: cd.order });
  }

  // CILO Mappings
  console.log("  → CILO Mappings...");
  const itCilos = ciloMap.get("ITRES1") ?? [];
  const mktCilos = ciloMap.get("MM201") ?? [];

  // IT CILOs → BSIT GOs
  for (const cilo of itCilos) {
    const goCode = cilo.order <= 2 ? "BSIT-GO1" : "BSIT-GO3";
    const go = goMap.get(goCode)!;
    const existing = await prisma.cILOMapping.findFirst({
      where: { cilo_id: cilo.id, go_id: go.id },
    });
    if (!existing) {
      await prisma.cILOMapping.create({ data: { cilo_id: cilo.id, go_id: go.id } });
    }
  }
  // MKT CILOs → BSBA GOs
  for (const cilo of mktCilos) {
    const goCode = cilo.order === 1 ? "BSBA-GO1" : "BSBA-GO2";
    const go = goMap.get(goCode)!;
    const existing = await prisma.cILOMapping.findFirst({
      where: { cilo_id: cilo.id, go_id: go.id },
    });
    if (!existing) {
      await prisma.cILOMapping.create({ data: { cilo_id: cilo.id, go_id: go.id } });
    }
  }

  return { goMap, ciloMap };
}
