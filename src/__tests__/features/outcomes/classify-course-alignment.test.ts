import { describe, expect, it } from "vitest";
import { classifyCourseAlignment } from "@/features/outcomes/services/classify-course-alignment";
import type { CILOMappingManifestation, CourseScope } from "@prisma/client";

type CiloRow = {
  cilo_mappings: Array<{
    manifestation: CILOMappingManifestation | null;
    go: { id: string; program_id: string | null; is_active: boolean };
  }>;
  cilo_institutional_outcome_mappings: Array<{
    manifestation: CILOMappingManifestation | null;
    institutional_outcome: { is_active: boolean };
  }>;
};

const PROGRAM = "program-1";

function mappedCilo(
  goId: string,
  manifestation: CILOMappingManifestation,
  programId = PROGRAM,
  isActive = true
): CiloRow {
  return {
    cilo_mappings: [
      { manifestation, go: { id: goId, program_id: programId, is_active: isActive } },
    ],
    cilo_institutional_outcome_mappings: [],
  };
}

function unmappedCilo(): CiloRow {
  return { cilo_mappings: [], cilo_institutional_outcome_mappings: [] };
}

function geCilo(
  activeTargets: number,
  manifestation: CILOMappingManifestation | null = "LEARNING"
): CiloRow {
  return {
    cilo_mappings: [],
    cilo_institutional_outcome_mappings: Array.from({ length: activeTargets }, () => ({
      manifestation,
      institutional_outcome: { is_active: true },
    })),
  };
}

function classify(
  cilos: CiloRow[],
  courseScope: CourseScope,
  owningProgramId: string | null,
  activeGoIds: string[]
) {
  return classifyCourseAlignment(cilos, courseScope, owningProgramId, activeGoIds);
}

describe("classifyCourseAlignment exhaustive readiness", () => {
  it("classifies a Program-specific Course incomplete when one active CILO lacks a GO manifestation", () => {
    const state = classify(
      [mappedCilo("go-1", "LEARNING"), unmappedCilo()],
      "PROGRAM_SPECIFIC",
      PROGRAM,
      ["go-1"]
    );
    expect(state).toBe("incomplete-mapping");
  });

  it("classifies a Program-specific Course incomplete when a CILO classifies only one of two active GOs", () => {
    const state = classify([mappedCilo("go-1", "LEARNING")], "PROGRAM_SPECIFIC", PROGRAM, [
      "go-1",
      "go-2",
    ]);
    expect(state).toBe("incomplete-mapping");
  });

  it("flips a fully classified Course back to incomplete when a new GO is added", () => {
    const cilos = [mappedCilo("go-1", "LEARNING")];
    expect(classify(cilos, "PROGRAM_SPECIFIC", PROGRAM, ["go-1"])).toBe("ready");
    // A newly created GO joins the active catalog, so the same rows no longer
    // cover every required pair until Faculty classify the new GO.
    expect(classify(cilos, "PROGRAM_SPECIFIC", PROGRAM, ["go-1", "go-2"])).toBe(
      "incomplete-mapping"
    );
  });

  it("classifies incomplete, not ready, when the Program has zero active GOs alongside active CILOs", () => {
    const state = classify([unmappedCilo()], "PROGRAM_SPECIFIC", PROGRAM, []);
    expect(state).toBe("incomplete-mapping");
  });

  it("classifies incomplete when a mapping row carries a null manifestation", () => {
    const cilo: CiloRow = {
      cilo_mappings: [
        { manifestation: null, go: { id: "go-1", program_id: PROGRAM, is_active: true } },
      ],
      cilo_institutional_outcome_mappings: [],
    };
    const state = classify([cilo], "PROGRAM_SPECIFIC", PROGRAM, ["go-1"]);
    expect(state).toBe("incomplete-mapping");
  });

  it("does not count a mapping to a GO outside the owning Program", () => {
    const state = classify(
      [mappedCilo("go-1", "LEARNING", "program-2")],
      "PROGRAM_SPECIFIC",
      PROGRAM,
      ["go-1"]
    );
    expect(state).toBe("incomplete-mapping");
  });

  it("does not count a mapping to an archived GO", () => {
    const state = classify(
      [mappedCilo("go-1", "LEARNING", PROGRAM, false)],
      "PROGRAM_SPECIFIC",
      PROGRAM,
      ["go-1"]
    );
    expect(state).toBe("incomplete-mapping");
  });

  it("classifies ready when every active CILO has a manifestation for every active GO", () => {
    const state = classify(
      [mappedCilo("go-1", "LEARNING"), mappedCilo("go-1", "PRACTICE")],
      "PROGRAM_SPECIFIC",
      PROGRAM,
      ["go-1"]
    );
    expect(state).toBe("ready");
  });

  it("classifies ready when a CILO covers every active GO even when archived GOs exist", () => {
    const state = classify(
      [
        {
          cilo_mappings: [
            { manifestation: "LEARNING", go: { id: "go-1", program_id: PROGRAM, is_active: true } },
            {
              manifestation: "OPPORTUNITY",
              go: { id: "go-2", program_id: PROGRAM, is_active: false },
            },
          ],
          cilo_institutional_outcome_mappings: [],
        },
      ],
      "PROGRAM_SPECIFIC",
      PROGRAM,
      ["go-1"]
    );
    expect(state).toBe("ready");
  });

  it("keeps missing-cilos for a Program-specific Course without active CILOs", () => {
    const state = classify([], "PROGRAM_SPECIFIC", PROGRAM, []);
    expect(state).toBe("missing-cilos");
  });

  it("keeps the at-least-one rule for General Education with an active Institutional Outcome", () => {
    const state = classify([geCilo(1)], "GENERAL_EDUCATION", null, []);
    expect(state).toBe("ready");
  });

  it("keeps General Education incomplete when no valid active Institutional Outcome exists", () => {
    const state = classify([geCilo(0)], "GENERAL_EDUCATION", null, []);
    expect(state).toBe("incomplete-mapping");
  });

  it("keeps General Education incomplete when the only ILO mapping has no manifestation", () => {
    const state = classify([geCilo(1, null)], "GENERAL_EDUCATION", null, []);
    expect(state).toBe("incomplete-mapping");
  });

  it("keeps General Education ready when one of several ILOs carries a manifestation", () => {
    const state = classify(
      [
        {
          cilo_mappings: [],
          cilo_institutional_outcome_mappings: [
            { manifestation: "PRACTICE", institutional_outcome: { is_active: true } },
            { manifestation: null, institutional_outcome: { is_active: true } },
          ],
        },
      ],
      "GENERAL_EDUCATION",
      null,
      []
    );
    expect(state).toBe("ready");
  });
});
