import { prisma } from "../../../src/lib/db/prisma";
import { U } from "../constants/ids";
import {
  ciloDefsGeneralEducation,
  ciloDefsIT,
  ciloDefsMKT,
  ciloDefsNewCourses,
  ciloMappingDefs,
  poDefs,
  commonPODefs,
  iloDefs,
} from "../fixtures/outcomes";
import type { FoundationContext, OutcomeContext } from "../types";

/** Same manifestation cycle the GE ILO seed uses: L, then P, then O by CILO order. */
function commonManifestationFor(order: number): "LEARNING" | "PRACTICE" | "OPPORTUNITY" {
  return order === 1 ? "LEARNING" : order === 2 ? "PRACTICE" : "OPPORTUNITY";
}

async function seedCommonPODefinitions(): Promise<
  Map<string, { id: string; description: string }>
> {
  const commonMap = new Map<string, { id: string; description: string }>();
  for (const definition of commonPODefs) {
    const common = await prisma.commonProgramOutcome.upsert({
      where: { code: definition.code },
      update: {
        description: definition.description,
        order: definition.order,
        is_active: true,
        source_ref: "System CLOIE demo fixture. Not an approved academic catalog.",
      },
      create: {
        ...definition,
        source_ref: "System CLOIE demo fixture. Not an approved academic catalog.",
      },
    });
    commonMap.set(definition.code, common);
  }
  return commonMap;
}
async function seedProgramPos(
  pMap: FoundationContext["pMap"]
): Promise<Map<string, { id: string }>> {
  const poMap = new Map<string, { id: string }>();
  for (const g of poDefs) {
    const prog = pMap.get(g.pc)!;
    const po = await prisma.pO.upsert({
      where: { program_id_code: { program_id: prog.id, code: g.code } },
      update: {
        description: g.desc,
        classification: g.classification,
        order: g.order,
        is_active: true,
      },
      create: {
        code: g.code,
        description: g.desc,
        classification: g.classification,
        order: g.order,
        program_id: prog.id,
      },
    });
    poMap.set(g.code, po);
  }
  return poMap;
}

async function seedCommonAdoptions(
  pMap: FoundationContext["pMap"],
  commonMap: Map<string, { id: string; description: string }>
): Promise<void> {
  for (const program of pMap.values()) {
    for (const definition of commonPODefs) {
      const common = commonMap.get(definition.code)!;
      await prisma.pO.upsert({
        where: { program_id_code: { program_id: program.id, code: definition.code } },
        update: {
          description: common.description,
          classification: "COMMON",
          common_outcome_id: common.id,
        },
        create: {
          program_id: program.id,
          code: definition.code,
          description: common.description,
          classification: "COMMON",
          common_outcome_id: common.id,
          order: definition.order + 3,
        },
      });
    }
    await prisma.pO.upsert({
      where: { program_id_code: { program_id: program.id, code: "ACD-PO1" } },
      update: { classification: "INSTITUTION_SPECIFIC" },
      create: {
        program_id: program.id,
        code: "ACD-PO1",
        classification: "INSTITUTION_SPECIFIC",
        description:
          "Contribute to inclusive community development through the college's mission of service.",
        order: 7,
      },
    });
  }
}

async function seedILOs(): Promise<Map<string, { id: string }>> {
  const iloMap = new Map<string, { id: string }>();
  for (const ilo of iloDefs) {
    const outcome = await prisma.institutionalOutcome.upsert({
      where: { code: ilo.code },
      update: { description: ilo.description, order: ilo.order, is_active: true },
      create: {
        code: ilo.code,
        description: ilo.description,
        order: ilo.order,
        is_active: true,
      },
    });
    iloMap.set(ilo.code, outcome);
  }
  return iloMap;
}

type SeededCilo = { id: string; description: string; order: number };

async function seedCILOs(cMap: FoundationContext["cMap"]): Promise<Map<string, SeededCilo[]>> {
  const ciloMap = new Map<string, SeededCilo[]>();
  for (const cd of [
    ...ciloDefsIT,
    ...ciloDefsMKT,
    ...ciloDefsNewCourses,
    ...ciloDefsGeneralEducation,
  ]) {
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
  return ciloMap;
}

/**
 * Creates a manifestation row, or classifies a legacy row created before the
 * manifestation column existed. A row that already carries a manifestation is
 * never overwritten.
 */
async function reconcileManifestation(
  existing: { id: string; manifestation: string | null } | null,
  create: () => Promise<unknown>,
  update: (id: string) => Promise<unknown>
): Promise<void> {
  if (!existing) {
    await create();
  } else if (existing.manifestation === null) {
    await update(existing.id);
  }
}

async function seedCILOMappings(
  poMap: Map<string, { id: string }>,
  ciloMap: Map<string, SeededCilo[]>
): Promise<void> {
  for (const def of ciloMappingDefs) {
    const cilo = (ciloMap.get(def.courseCode) ?? []).find((c) => c.order === def.ciloOrder);
    const po = poMap.get(def.poCode)!;
    const ciloId = cilo!.id;
    const existing = await prisma.cILOMapping.findFirst({
      where: { cilo_id: ciloId, po_id: po.id },
    });
    await reconcileManifestation(
      existing,
      () =>
        prisma.cILOMapping.create({
          data: { cilo_id: ciloId, po_id: po.id, manifestation: def.manifestation },
        }),
      (id) =>
        prisma.cILOMapping.update({
          where: { id },
          data: { manifestation: def.manifestation, updated_at: new Date() },
        })
    );
  }
}

async function seedGeneralEducationCommonMappings(
  geCilos: SeededCilo[],
  commonMap: Map<string, { id: string }>,
  actorFor: (description: string) => string
): Promise<void> {
  for (const cilo of geCilos) {
    const common = commonMap.get(cilo.order === 1 ? "COMMON-2" : "COMMON-3")!;
    const actor = actorFor(cilo.description);
    await prisma.cILOCommonPOMapping.upsert({
      where: { cilo_id_common_outcome_id: { cilo_id: cilo.id, common_outcome_id: common.id } },
      update: { manifestation: commonManifestationFor(cilo.order), updated_by: actor },
      create: {
        cilo_id: cilo.id,
        common_outcome_id: common.id,
        manifestation: commonManifestationFor(cilo.order),
        created_by: actor,
        updated_by: actor,
      },
    });
  }
}

async function seedGeneralEducationILOMappings(
  geCilos: SeededCilo[],
  iloMap: Map<string, { id: string }>,
  actorFor: (description: string) => string
): Promise<void> {
  for (const cilo of geCilos) {
    const ilo = iloMap.get(`ILO${Math.min(cilo.order, 5)}`)!;
    const manifestation = commonManifestationFor(cilo.order);
    const actor = actorFor(cilo.description);
    const existing = await prisma.cILOInstitutionalOutcomeMapping.findFirst({
      where: { cilo_id: cilo.id, institutional_outcome_id: ilo.id },
    });
    await reconcileManifestation(
      existing,
      () =>
        prisma.cILOInstitutionalOutcomeMapping.create({
          data: {
            cilo_id: cilo.id,
            institutional_outcome_id: ilo.id,
            manifestation,
            created_by: actor,
            updated_by: actor,
          },
        }),
      (id) =>
        prisma.cILOInstitutionalOutcomeMapping.update({
          where: { id },
          data: { manifestation, updated_at: new Date() },
        })
    );
  }
}

async function seedGeneralEducationMappings(
  ciloMap: Map<string, SeededCilo[]>,
  commonMap: Map<string, { id: string }>,
  iloMap: Map<string, { id: string }>
): Promise<void> {
  const geCreatorByDescription = new Map<string, string>(
    ciloDefsGeneralEducation.map((cd) => [cd.desc, cd.createdBy])
  );
  const actorFor = (description: string) => geCreatorByDescription.get(description) ?? U.FAC_BSIT;
  const geCilos = ["GESTECH", "GEETHICS"].flatMap((courseCode) => ciloMap.get(courseCode) ?? []);
  await seedGeneralEducationCommonMappings(geCilos, commonMap, actorFor);
  await seedGeneralEducationILOMappings(geCilos, iloMap, actorFor);
}

export async function seedOutcomes({
  pMap,
  cMap,
}: Pick<FoundationContext, "pMap" | "cMap">): Promise<OutcomeContext> {
  const commonMap = await seedCommonPODefinitions();
  console.log("  → Program Outcomes...");
  const poMap = await seedProgramPos(pMap);
  await seedCommonAdoptions(pMap, commonMap);
  console.log("  → Institutional Outcomes...");
  const iloMap = await seedILOs();
  console.log("  → CILOs...");
  const ciloMap = await seedCILOs(cMap);
  console.log("  → CILO Mappings...");
  await seedCILOMappings(poMap, ciloMap);
  console.log("  → General Education CILO → Institutional Outcome Mappings...");
  await seedGeneralEducationMappings(ciloMap, commonMap, iloMap);
  return { poMap, iloMap, ciloMap };
}
