import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgramHeadGoSummary } from "@/features/analytics/components/program-head-po-summary";
import type { DashboardGoSummaryRow } from "@/features/analytics/services/get-program-head-dashboard";
import type { DashboardSourceKey } from "@/features/analytics/program-head-dashboard-labels";

const PROGRAM_ID = "program-bsed";

function evidenceRow(overrides: Partial<DashboardGoSummaryRow> = {}): DashboardGoSummaryRow {
  return {
    poId: "po-1",
    poCode: "PO 1",
    mean: 4.42,
    ratingCount: 614,
    responseCount: 163,
    evaluationCount: 8,
    contributorCount: 11,
    contributorKind: "questions",
    spansMultipleScales: false,
    scaleMax: 5,
    hasEvidence: true,
    evidenceSummary: { ratingCount: 614, explanation: "Raw mean of 614 valid ratings." },
    ...overrides,
  };
}

const EMPTY_SOURCES = {
  COURSE_STUDENT: [],
  CENTRAL_STUDENT: [],
  ALUMNI: [],
  INDUSTRY_PARTNER: [],
} as Record<DashboardSourceKey, DashboardGoSummaryRow[]>;

describe("ProgramHeadGoSummary matrix selection", () => {
  it("deep-links every PO row into Analytics Outcomes with period, source, and PO preserved", () => {
    render(
      <ProgramHeadGoSummary
        sources={{ ...EMPTY_SOURCES, COURSE_STUDENT: [evidenceRow()] }}
        poCatalog={[{ id: "po-1", code: "PO 1" }]}
        programId={PROGRAM_ID}
        periodFilters={{ termInstanceId: "term-1", semester: "SECOND" }}
      />
    );

    const poLink = screen.getByRole("link", { name: "PO 1" });
    expect(poLink.getAttribute("href")).toContain(`/program-head/programs/${PROGRAM_ID}/analytics`);
    expect(poLink.getAttribute("href")).toContain("tab=outcomes");
    expect(poLink.getAttribute("href")).toContain("poId=po-1");
    expect(poLink.getAttribute("href")).toContain("evidenceSource=COURSE");
    expect(poLink.getAttribute("href")).toContain("termInstanceId=term-1");
    expect(poLink.getAttribute("href")).toContain("semester=SECOND");
  });

  it("switching the evidence source re-scopes every row link and the disclosure", () => {
    render(
      <ProgramHeadGoSummary
        sources={{
          ...EMPTY_SOURCES,
          COURSE_STUDENT: [evidenceRow()],
          ALUMNI: [
            evidenceRow({ poCode: "PO 1", contributorKind: "questions", contributorCount: 6 }),
          ],
        }}
        poCatalog={[{ id: "po-1", code: "PO 1" }]}
        programId={PROGRAM_ID}
        periodFilters={{}}
      />
    );

    const courseLink = screen.getByRole("link", { name: "PO 1" });
    expect(courseLink.getAttribute("href")).toContain("evidenceSource=COURSE");

    fireEvent.click(screen.getByRole("button", { name: "Alumni" }));

    const alumniLink = screen.getByRole("link", { name: "PO 1" });
    expect(alumniLink.getAttribute("href")).toContain("evidenceSource=ALUMNI");
    expect(alumniLink.getAttribute("href")).toContain("stakeholder=ALUMNI");
    expect(alumniLink.getAttribute("href")).toContain("poId=po-1");
  });

  it("keeps course rows from leaking a stakeholder value", () => {
    render(
      <ProgramHeadGoSummary
        sources={{ ...EMPTY_SOURCES, COURSE_STUDENT: [evidenceRow()] }}
        poCatalog={[{ id: "po-1", code: "PO 1" }]}
        programId={PROGRAM_ID}
        periodFilters={{}}
      />
    );

    const poLink = screen.getByRole("link", { name: "PO 1" });
    expect(poLink.getAttribute("href")).not.toContain("stakeholder=");
  });

  it("exposes how-calculated disclosure per row and no evidence rows explain their absence", () => {
    render(
      <ProgramHeadGoSummary
        sources={{ ...EMPTY_SOURCES, COURSE_STUDENT: [evidenceRow()] }}
        poCatalog={[
          { id: "po-1", code: "PO 1" },
          { id: "plo-2", code: "PO 2" },
        ]}
        programId={PROGRAM_ID}
        periodFilters={{}}
      />
    );

    const row = screen.getByRole("link", { name: "PO 1" }).closest("div")?.parentElement;
    expect(row).not.toBeNull();
    expect(
      within(row as HTMLElement).getByRole("button", { name: "How calculated: PO 1" })
    ).toBeInTheDocument();

    // Catalog POs without evidence still disclose that nothing contributed.
    const emptyRow = screen.getByRole("link", { name: "PO 2" }).closest("div")?.parentElement;
    fireEvent.click(
      within(emptyRow as HTMLElement).getByRole("button", { name: "How calculated: PO 2" })
    );
    expect(
      screen.getByText(
        "No evidence from this source for this Program Outcome in the selected period."
      )
    ).toBeInTheDocument();
  });
});
