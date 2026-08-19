import { describe, expect, it } from "vitest";
import { classifyCourseAlignment } from "@/features/outcomes/services/classify-course-alignment";
import type { CILOMappingManifestation, CourseScope } from "@prisma/client";

type CiloRow = {
  cilo_mappings: Array<{
    manifestation: CILOMappingManifestation | null;
    plo: { id: string; program_id: string | null; is_active: boolean };
  }>;
  cilo_institutional_outcome_mappings: Array<{
    institutional_outcome: { is_active: boolean };
  }>;
};

const PROGRAM = "program-1";

function mappedCilo(
  ploId: string,
  manifestation: CILOMappingManifestation,
  programId = PROGRAM,
  isActive = true
): CiloRow {
  return {
    cilo_mappings: [
      { manifestation, plo: { id: ploId, program_id: programId, is_active: isActive } },
    ],
    cilo_institutional_outcome_mappings: [],
  };
}

function unmappedCilo(): CiloRow {
  return { cilo_mappings: [], cilo_institutional_outcome_mappings: [] };
}

function geCilo(activeTargets: number): CiloRow {
  return {
    cilo_mappings: [],
    cilo_institutional_outcome_mappings: Array.from({ length: activeTargets }, () => ({
      institutional_outcome: { is_active: true },
    })),
  };
}

function classify(
  cilos: CiloRow[],
  courseScope: CourseScope,
  owningProgramId: string | null,
  activePloIds: string[]
) {
  return classifyCourseAlignment(cilos, courseScope, owningProgramId, activePloIds);
}

describe("classifyCourseAlignment exhaustive readiness", () => {
  it("classifies a Program-specific Course incomplete when one active CILO lacks a PLO manifestation", () => {
    const state = classify(
      [mappedCilo("plo-1", "LEARNING"), unmappedCilo()],
      "PROGRAM_SPECIFIC",
      PROGRAM,
      ["plo-1"]
    );
    expect(state).toBe("incomplete-mapping");
  });

  it("classifies a Program-specific Course incomplete when a CILO classifies only one of two active PLOs", () => {
    const state = classify(
      [mappedCilo("plo-1", "LEARNING")],
      "PROGRAM_SPECIFIC",
      PROGRAM,
      ["plo-1", "plo-2"]
    );
    expect(state).toBe("incomplete-mapping");
  });

  it("classifies incomplete, not ready, when the Program has zero active PLOs alongside active CILOs", () => {
    const state = classify([unmappedCilo()], "PROGRAM_SPECIFIC", PROGRAM, []);
    expect(state).toBe("incomplete-mapping");
  });

  it("classifies incomplete when a mapping row carries a null manifestation", () => {
const cilo: CiloRow = {
      cilo_mappings: [
        { manifestation: null, plo: { id: "plo-1", program_id: PROGRAM, is_active: true } },
      ],
      cilo_institutional_outcome_mappings: [],
    };
    const state = classify([cilo], "PROGRAM_SPECIFIC", PROGRAM, ["plo-1"]);
    expect(state).toBe("incomplete-mapping");
  });

  it("does not count a mapping to a PLO outside the owning Program", () => {
    const state = classify(
      [mappedCilo("plo-1", "LEARNING", "program-2")],
      "PROGRAM_SPECIFIC",
      PROGRAM,
      ["plo-1"]
    );
    expect(state).toBe("incomplete-mapping");
  });

  it("does not count a mapping to an archived PLO", () => {
    const state = classify(
      [mappedCilo("plo-1", "LEARNING", PROGRAM, false)],
      "PROGRAM_SPECIFIC",
      PROGRAM,
      ["plo-1"]
    );
    expect(state).toBe("incomplete-mapping");
  });

  it("classifies ready when every active CILO has a manifestation for every active PLO", () => {
    const state = classify(
      [mappedCilo("plo-1", "LEARNING"), mappedCilo("plo-1", "PRACTICE")],
      "PROGRAM_SPECIFIC",
      PROGRAM,
      ["plo-1"]
    );
    expect(state).toBe("ready");
  });

  it("classifies ready when a CILO covers every active PLO even when archived PLOs exist", () => {
    const state = classify(
      [
        {
          cilo_mappings: [
            { manifestation: "LEARNING", plo: { id: "plo-1", program_id: PROGRAM, is_active: true } },
            {
              manifestation: "OPPORTUNITY",
              plo: { id: "plo-2", program_id: PROGRAM, is_active: false },
            },
          ],
          cilo_institutional_outcome_mappings: [],
        },
      ],
      "PROGRAM_SPECIFIC",
      PROGRAM,
      ["plo-1"]
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
});