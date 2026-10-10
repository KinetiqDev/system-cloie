import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgramHeadGoSummary } from "@/features/analytics/components/program-head-po-summary";
import { classifyOutcomeMean } from "@/features/analytics/aggregators/outcome-attainment";
import type { DashboardPoRow } from "@/features/analytics/services/get-program-head-dashboard";
import type { DashboardSourceKey } from "@/features/analytics/program-head-dashboard-labels";

const PROGRAM_ID = "program-bsed";

function evidenceRow(overrides: Partial<DashboardPoRow> = {}): DashboardPoRow {
  return {
    poId: "po-1",
    poCode: "PO 1",
    mean: 4.42,
    spansMultipleScales: false,
    scaleMax: 5,
    hasEvidence: true,
    attainment: classifyOutcomeMean(null, null),
    ...overrides,
  };
}

const EMPTY_SOURCES = {
  COURSE_STUDENT: [],
  CENTRAL_STUDENT: [],
  ALUMNI: [],
  INDUSTRY_PARTNER: [],
} as Record<DashboardSourceKey, DashboardPoRow[]>;

const poLink = (code: string) => screen.getByRole("link", { name: new RegExp(`^${code}:`) });

describe("ProgramHeadGoSummary", () => {
  it("deep-links every PO row into Analytics Outcomes with period, source, and PO preserved", () => {
    render(
      <ProgramHeadGoSummary
        sources={{ ...EMPTY_SOURCES, COURSE_STUDENT: [evidenceRow()] }}
        poCatalog={[{ id: "po-1", code: "PO 1" }]}
        programId={PROGRAM_ID}
        periodFilters={{ termInstanceId: "term-1", semester: "SECOND" }}
      />
    );

    const href = poLink("PO 1").getAttribute("href")!;
    expect(href).toContain(`/program-head/programs/${PROGRAM_ID}/analytics`);
    expect(href).toContain("tab=outcomes");
    expect(href).toContain("poId=po-1");
    expect(href).toContain("evidenceSource=COURSE");
    expect(href).not.toContain("stakeholder=");
    expect(href).toContain("termInstanceId=term-1");
    expect(href).toContain("semester=SECOND");
  });

  it("switching the evidence source re-scopes the rows and their links", () => {
    render(
      <ProgramHeadGoSummary
        sources={{
          ...EMPTY_SOURCES,
          COURSE_STUDENT: [evidenceRow()],
          ALUMNI: [evidenceRow({ mean: 3.1 })],
        }}
        poCatalog={[{ id: "po-1", code: "PO 1" }]}
        programId={PROGRAM_ID}
        periodFilters={{}}
      />
    );

    expect(poLink("PO 1")).toHaveTextContent("4.42");
    fireEvent.click(screen.getByRole("button", { name: "Alumni" }));

    const alumni = poLink("PO 1");
    expect(alumni).toHaveTextContent("3.10");
    expect(alumni.getAttribute("href")).toContain("evidenceSource=ALUMNI");
    expect(alumni.getAttribute("href")).toContain("stakeholder=ALUMNI");
  });

  it("lists catalog POs without evidence as unclassified rather than as non-attainment", () => {
    render(
      <ProgramHeadGoSummary
        sources={{ ...EMPTY_SOURCES, COURSE_STUDENT: [evidenceRow()] }}
        poCatalog={[
          { id: "po-1", code: "PO 1" },
          { id: "po-2", code: "PO 2" },
        ]}
        programId={PROGRAM_ID}
        periodFilters={{}}
      />
    );

    expect(poLink("PO 2")).toHaveAccessibleName("PO 2: mean —, no evidence");
    expect(screen.getByText(/without evidence/)).toBeInTheDocument();
  });

  it("distinguishes rated unsupported and mixed scales from missing evidence", () => {
    render(
      <ProgramHeadGoSummary
        sources={{
          ...EMPTY_SOURCES,
          COURSE_STUDENT: [
            evidenceRow({ attainment: classifyOutcomeMean(4.42, null) }),
            evidenceRow({
              poId: "po-2",
              poCode: "PO 2",
              mean: null,
              spansMultipleScales: true,
              scaleMax: null,
              attainment: classifyOutcomeMean(null, null, { spansMultipleScales: true }),
            }),
          ],
        }}
        poCatalog={[
          { id: "po-1", code: "PO 1" },
          { id: "po-2", code: "PO 2" },
          { id: "po-3", code: "PO 3" },
        ]}
        programId={PROGRAM_ID}
        periodFilters={{}}
      />
    );

    expect(poLink("PO 1")).toHaveAccessibleName(
      "PO 1: mean 4.42, unsupported scale, not classified"
    );
    expect(poLink("PO 2")).toHaveAccessibleName(
      "PO 2: mean Mixed scales, mixed scales, not classified"
    );
    expect(poLink("PO 3")).toHaveAccessibleName("PO 3: mean —, no evidence");
    expect(screen.getByText("without evidence").parentElement).toHaveTextContent(
      "1 without evidence"
    );
    expect(screen.getByText("not classified").parentElement).toHaveTextContent("2 not classified");
  });
});
