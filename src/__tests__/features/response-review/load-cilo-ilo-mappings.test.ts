import { beforeEach, describe, expect, it, vi } from "vitest";

const { iloMappingFindManyMock, goMappingFindManyMock } = vi.hoisted(() => ({
  iloMappingFindManyMock: vi.fn(),
  goMappingFindManyMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    cILOInstitutionalOutcomeMapping: { findMany: iloMappingFindManyMock },
    cILOMapping: { findMany: goMappingFindManyMock },
  },
}));

import {
  loadCiloIloMappings,
  loadCiloMappings,
} from "@/features/response-review/services/cilo-mappings";

// ---------------------------------------------------------------------------
// ADR 0035: the two typed alignment layers are separate tables with separate
// readers. These checks pin that separation at the read boundary — a General
// Education CILO resolves Institutional Learning Outcomes and never Graduate
// Outcomes — and pin that manifestation never decides whether an alignment
// exists.
// ---------------------------------------------------------------------------

function iloRow(overrides: Record<string, unknown> = {}) {
  return {
    cilo_id: "cilo-1",
    manifestation: "LEARNING" as const,
    institutional_outcome: { id: "ilo-1", code: "ILO1", description: "Think critically" },
    ...overrides,
  };
}

describe("loadCiloIloMappings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads only the institutional-outcome mapping table", async () => {
    iloMappingFindManyMock.mockResolvedValue([iloRow()]);

    const byCilo = await loadCiloIloMappings(["cilo-1"]);

    expect(iloMappingFindManyMock).toHaveBeenCalledTimes(1);
    expect(goMappingFindManyMock).not.toHaveBeenCalled();
    expect(byCilo.get("cilo-1")).toEqual([
      {
        iloId: "ilo-1",
        iloCode: "ILO1",
        iloDescription: "Think critically",
        manifestation: "LEARNING",
      },
    ]);
  });

  it("keeps a mapping whose manifestation was never classified", async () => {
    // Manifestation is descriptive: it never filters or weights a
    // contribution. Hiding an unclassified row would silently drop real
    // alignment evidence, so the row survives and reads as unclassified.
    iloMappingFindManyMock.mockResolvedValue([iloRow({ manifestation: null })]);

    const byCilo = await loadCiloIloMappings(["cilo-1"]);

    expect(byCilo.get("cilo-1")).toEqual([
      {
        iloId: "ilo-1",
        iloCode: "ILO1",
        iloDescription: "Think critically",
        manifestation: null,
      },
    ]);
  });

  it("never queries for an empty CILO id set", async () => {
    expect(await loadCiloIloMappings([])).toEqual(new Map());
    expect(iloMappingFindManyMock).not.toHaveBeenCalled();
  });

  it("leaves the Program Head GO reader on its own table", async () => {
    goMappingFindManyMock.mockResolvedValue([
      {
        cilo_id: "cilo-1",
        manifestation: "PRACTICE",
        go: { id: "go-1", code: "BSIT-GO1", description: "Analyse." },
      },
    ]);

    const byCilo = await loadCiloMappings(["cilo-1"]);

    expect(iloMappingFindManyMock).not.toHaveBeenCalled();
    expect(byCilo.get("cilo-1")?.[0]).toMatchObject({
      goCode: "BSIT-GO1",
      manifestation: "PRACTICE",
    });
  });
});
