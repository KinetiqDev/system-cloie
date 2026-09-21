import type { CiloGoMapping } from "@/features/analytics/aggregators/types";
import { prisma } from "@/lib/db/prisma";

/**
 * Load the selected Program's current CILO→GO mappings for the given CILO
 * ids, in the canonical CiloGoMapping shape. Rows without a manifestation
 * are degenerate and skipped.
 */
export async function loadCiloMappings(ciloIds: string[]): Promise<Map<string, CiloGoMapping[]>> {
  if (ciloIds.length === 0) {
    return new Map();
  }
  const rows = await prisma.cILOMapping.findMany({
    where: { cilo_id: { in: ciloIds } },
    include: { go: { select: { id: true, code: true, description: true } } },
  });
  const byCilo = new Map<string, CiloGoMapping[]>();
  for (const row of rows) {
    if (!row.manifestation) {
      continue;
    }
    const entry: CiloGoMapping = {
      goId: row.go.id,
      goCode: row.go.code,
      goDescription: row.go.description,
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
