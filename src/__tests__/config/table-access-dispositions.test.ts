import { describe, expect, it } from "vitest";

import {
  TABLE_ACCESS_DISPOSITIONS,
  checkTableAccessDispositions,
  listPrismaTableNames,
  type TableAccessDisposition,
} from "@/lib/db/table-access-dispositions";

describe("table access dispositions (542)", () => {
  it("covers every Prisma-backed table with exactly one disposition", () => {
    const tables = listPrismaTableNames();
    expect(tables.length).toBeGreaterThan(0);

    const result = checkTableAccessDispositions(tables);
    expect(result.errors, `disposition registry drift:\n${result.errors.join("\n")}`).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("never registers a disposition for a table missing from the Prisma schema", () => {
    const tables = new Set(listPrismaTableNames());
    const registered = Object.keys(TABLE_ACCESS_DISPOSITIONS);
    const orphans = registered.filter((table) => !tables.has(table));
    expect(orphans, `dispositions registered for unknown tables: ${orphans.join(", ")}`).toEqual(
      []
    );
  });

  it("supports every declared disposition kind with its required fields", () => {
    const kinds = new Set(
      Object.values(TABLE_ACCESS_DISPOSITIONS).map((disposition) => disposition.kind)
    );
    // The four-disposition vocabulary is the security model: role-aware RLS,
    // authenticated read-only, server-only, application-layer exception.
    expect(kinds.size).toBeGreaterThan(0);
    for (const disposition of Object.values(
      TABLE_ACCESS_DISPOSITIONS
    ) as TableAccessDisposition[]) {
      if (disposition.kind === "application-layer-exception") {
        expect(disposition.owner.length).toBeGreaterThan(0);
        expect(disposition.justification.length).toBeGreaterThan(0);
      }
      if (disposition.kind === "role-aware-rls" || disposition.kind === "authenticated-read") {
        expect(disposition.evidence.length).toBeGreaterThan(0);
      }
    }
  });
});
