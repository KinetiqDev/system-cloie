import type { CILOMappingManifestation } from "@prisma/client";
import type { CiloGoMapping } from "@/features/analytics/aggregators/types";
import { prisma } from "@/lib/db/prisma";

// ---------------------------------------------------------------------------
// Typed CILO→outcome alignment reads (ADR 0035)
//
// The two alignment layers are different tables, never one polymorphic read:
// `CILOMapping` names a Program's Program Outcome and `CILOInstitutional
// OutcomeMapping` names a college-wide Institutional Learning Outcome. A
// General Education CILO carries the latter only, so reading PO mappings there
// would either return Program-specific noise or, worse, attribute PO
// semantics to college-wide evidence. Each loader below therefore has one
// caller layer and one table.
// ---------------------------------------------------------------------------

/** One current CILO→ILO alignment, with its descriptive manifestation. */
export type CiloIloMapping = {
  iloId: string;
  iloCode: string;
  iloDescription: string;
  manifestation: CILOMappingManifestation | null;
};

/**
 * Load the selected Program's current CILO→PO mappings for the given CILO
 * ids, in the canonical CiloGoMapping shape. Rows without a manifestation
 * are degenerate and skipped.
 */
export async function loadCiloMappings(ciloIds: string[]): Promise<Map<string, CiloGoMapping[]>> {
  if (ciloIds.length === 0) {
    return new Map();
  }
  const rows = await prisma.cILOMapping.findMany({
    where: { cilo_id: { in: ciloIds } },
    include: { po: { select: { id: true, code: true, description: true } } },
  });
  const byCilo = new Map<string, CiloGoMapping[]>();
  for (const row of rows) {
    if (!row.manifestation) {
      continue;
    }
    const entry: CiloGoMapping = {
      poId: row.po.id,
      poCode: row.po.code,
      poDescription: row.po.description,
      manifestation: row.manifestation,
    };
    const group = byCilo.get(row.cilo_id);
    if (group) {
      group.push(entry);
    } else {
      byCilo.set(row.cilo_id, [entry]);
    }
  }
  return byCilo;
}

/**
 * Load the current CILO→ILO alignments for the given CILO ids. General
 * Education CILOs align to college-wide Institutional Learning Outcomes, so
 * this is the only alignment layer a Coordinator surface may read.
 *
 * Rows without a manifestation are kept. Manifestation is descriptive only —
 * it never filters or weights a contribution (ADR 0035) — so a legacy row
 * with no classification is still real evidence of alignment and is presented
 * as "not classified" instead of disappearing. A degenerate row would have to
 * be repaired in the mapping table, never hidden from a reader.
 */
export async function loadCiloIloMappings(
  ciloIds: string[]
): Promise<Map<string, CiloIloMapping[]>> {
  if (ciloIds.length === 0) {
    return new Map();
  }
  const rows = await prisma.cILOInstitutionalOutcomeMapping.findMany({
    where: { cilo_id: { in: ciloIds } },
    include: {
      institutional_outcome: { select: { id: true, code: true, description: true } },
    },
  });
  const byCilo = new Map<string, CiloIloMapping[]>();
  for (const row of rows) {
    const entry: CiloIloMapping = {
      iloId: row.institutional_outcome.id,
      iloCode: row.institutional_outcome.code,
      iloDescription: row.institutional_outcome.description,
      manifestation: row.manifestation,
    };
    const group = byCilo.get(row.cilo_id);
    if (group) {
      group.push(entry);
    } else {
      byCilo.set(row.cilo_id, [entry]);
    }
  }
  return byCilo;
}

export type CiloCommonMapping = {
  commonId: string;
  code: string;
  description: string;
  manifestation: CILOMappingManifestation | null;
};

export async function loadCiloCommonMappings(
  ciloIds: string[]
): Promise<Map<string, CiloCommonMapping[]>> {
  if (!ciloIds.length) return new Map();
  const rows = await prisma.cILOCommonPOMapping.findMany({
    where: { cilo_id: { in: ciloIds } },
    include: { common_outcome: true },
  });
  const result = new Map<string, CiloCommonMapping[]>();
  for (const row of rows)
    result.set(row.cilo_id, [
      ...(result.get(row.cilo_id) ?? []),
      {
        commonId: row.common_outcome.id,
        code: row.common_outcome.code,
        description: row.common_outcome.description,
        manifestation: row.manifestation,
      },
    ]);
  return result;
}
