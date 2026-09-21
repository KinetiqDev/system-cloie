import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgramHeadGoSummary } from "@/features/analytics/components/program-head-go-summary";
import type { DashboardGoSummaryRow } from "@/features/analytics/services/get-program-head-dashboard";
import type { DashboardSourceKey } from "@/features/analytics/program-head-dashboard-labels";

const PROGRAM_ID = "program-bsed";

function evidenceRow(overrides: Partial<DashboardGoSummaryRow> = {}): DashboardGoSummaryRow {
  return {
    goId: "plo-1",
    goCode: "GO 1",
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
  it("deep-links every GO row into Analytics Outcomes with period, source, and GO preserved", () => {
    render(
      <ProgramHeadGoSummary
        sources={{ ...EMPTY_SOURCES, COURSE_STUDENT: [evidenceRow()] }}
        goCatalog={[{ id: "plo-1", code: "GO 1" }]}
        programId={PROGRAM_ID}
        periodFilters={{ termInstanceId: "term-1", semester: "SECOND" }}
      />
    );

    const goLink = screen.getByRole("link", { name: "GO 1" });
    expect(goLink.getAttribute("href")).toContain(`/program-head/programs/${PROGRAM_ID}/analytics`);
    expect(goLink.getAttribute("href")).toContain("tab=outcomes");
    expect(goLink.getAttribute("href")).toContain("goId=plo-1");
    expect(goLink.getAttribute("href")).toContain("evidenceSource=COURSE");
    expect(goLink.getAttribute("href")).toContain("termInstanceId=term-1");
    expect(goLink.getAttribute("href")).toContain("semester=SECOND");
  });

  it("switching the evidence source re-scopes every row link and the disclosure", () => {
    render(
      <ProgramHeadGoSummary
        sources={{
          ...EMPTY_SOURCES,
          COURSE_STUDENT: [evidenceRow()],
          ALUMNI: [
            evidenceRow({ goCode: "GO 1", contributorKind: "questions", contributorCount: 6 }),
          ],
        }}
        goCatalog={[{ id: "plo-1", code: "GO 1" }]}
        programId={PROGRAM_ID}
        periodFilters={{}}
      />
    );

    const courseLink = screen.getByRole("link", { name: "GO 1" });
    expect(courseLink.getAttribute("href")).toContain("evidenceSource=COURSE");

    fireEvent.click(screen.getByRole("button", { name: "Alumni" }));

    const alumniLink = screen.getByRole("link", { name: "GO 1" });
    expect(alumniLink.getAttribute("href")).toContain("evidenceSource=ALUMNI");
    expect(alumniLink.getAttribute("href")).toContain("stakeholder=ALUMNI");
    expect(alumniLink.getAttribute("href")).toContain("goId=plo-1");
  });

  it("keeps course rows from leaking a stakeholder value", () => {
    render(
      <ProgramHeadGoSummary
        sources={{ ...EMPTY_SOURCES, COURSE_STUDENT: [evidenceRow()] }}
        goCatalog={[{ id: "plo-1", code: "GO 1" }]}
        programId={PROGRAM_ID}
        periodFilters={{}}
      />
    );

    const goLink = screen.getByRole("link", { name: "GO 1" });
    expect(goLink.getAttribute("href")).not.toContain("stakeholder=");
  });

  it("exposes how-calculated disclosure per row and no evidence rows explain their absence", () => {
    render(
      <ProgramHeadGoSummary
        sources={{ ...EMPTY_SOURCES, COURSE_STUDENT: [evidenceRow()] }}
        goCatalog={[
          { id: "plo-1", code: "GO 1" },
          { id: "plo-2", code: "GO 2" },
        ]}
        programId={PROGRAM_ID}
        periodFilters={{}}
      />
    );

    const row = screen.getByRole("link", { name: "GO 1" }).closest("div")?.parentElement;
    expect(row).not.toBeNull();
    expect(
      within(row as HTMLElement).getByRole("button", { name: "How calculated: GO 1" })
    ).toBeInTheDocument();

    // Catalog GOs without evidence still disclose that nothing contributed.
    const emptyRow = screen.getByRole("link", { name: "GO 2" }).closest("div")?.parentElement;
    fireEvent.click(
      within(emptyRow as HTMLElement).getByRole("button", { name: "How calculated: GO 2" })
    );
    expect(
      screen.getByText(
        "No evidence from this source for this Graduate Outcome in the selected period."
      )
    ).toBeInTheDocument();
  });
});
