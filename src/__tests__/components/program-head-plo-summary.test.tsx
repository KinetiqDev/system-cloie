import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgramHeadPloSummary } from "@/features/analytics/components/program-head-plo-summary";
import type { DashboardPloSummaryRow } from "@/features/analytics/services/get-program-head-dashboard";
import type { DashboardSourceKey } from "@/features/analytics/program-head-dashboard-labels";

const PROGRAM_ID = "program-bsed";

function evidenceRow(overrides: Partial<DashboardPloSummaryRow> = {}): DashboardPloSummaryRow {
  return {
    ploId: "plo-1",
    ploCode: "PLO 1",
    mean: 4.42,
    ratingCount: 614,
    responseCount: 163,
    evaluationCount: 8,
    contributorCount: 11,
    contributorKind: "cilos",
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
} as Record<DashboardSourceKey, DashboardPloSummaryRow[]>;

describe("ProgramHeadPloSummary matrix selection", () => {
  it("deep-links every PLO row into Analytics Outcomes with period, source, and PLO preserved", () => {
    render(
      <ProgramHeadPloSummary
        sources={{ ...EMPTY_SOURCES, COURSE_STUDENT: [evidenceRow()] }}
        ploCatalog={[{ id: "plo-1", code: "PLO 1" }]}
        programId={PROGRAM_ID}
        periodFilters={{ termInstanceId: "term-1", semester: "SECOND" }}
      />
    );

    const ploLink = screen.getByRole("link", { name: "PLO 1" });
    expect(ploLink.getAttribute("href")).toContain(`/program-head/programs/${PROGRAM_ID}/analytics`);
    expect(ploLink.getAttribute("href")).toContain("tab=outcomes");
    expect(ploLink.getAttribute("href")).toContain("ploId=plo-1");
    expect(ploLink.getAttribute("href")).toContain("evidenceSource=COURSE");
    expect(ploLink.getAttribute("href")).toContain("termInstanceId=term-1");
    expect(ploLink.getAttribute("href")).toContain("semester=SECOND");
  });

  it("switching the evidence source re-scopes every row link and the disclosure", () => {
    render(
      <ProgramHeadPloSummary
        sources={{
          ...EMPTY_SOURCES,
          COURSE_STUDENT: [evidenceRow()],
          ALUMNI: [evidenceRow({ ploCode: "PLO 1", contributorKind: "questions", contributorCount: 6 })],
        }}
        ploCatalog={[{ id: "plo-1", code: "PLO 1" }]}
        programId={PROGRAM_ID}
        periodFilters={{}}
      />
    );

    const courseLink = screen.getByRole("link", { name: "PLO 1" });
    expect(courseLink.getAttribute("href")).toContain("evidenceSource=COURSE");

    fireEvent.click(screen.getByRole("button", { name: "Alumni" }));

    const alumniLink = screen.getByRole("link", { name: "PLO 1" });
    expect(alumniLink.getAttribute("href")).toContain("evidenceSource=ALUMNI");
    expect(alumniLink.getAttribute("href")).toContain("stakeholder=ALUMNI");
    expect(alumniLink.getAttribute("href")).toContain("ploId=plo-1");
  });

  it("keeps course rows from leaking a stakeholder value", () => {
    render(
      <ProgramHeadPloSummary
        sources={{ ...EMPTY_SOURCES, COURSE_STUDENT: [evidenceRow()] }}
        ploCatalog={[{ id: "plo-1", code: "PLO 1" }]}
        programId={PROGRAM_ID}
        periodFilters={{}}
      />
    );

    const ploLink = screen.getByRole("link", { name: "PLO 1" });
    expect(ploLink.getAttribute("href")).not.toContain("stakeholder=");
  });

  it("exposes how-calculated disclosure per row and no evidence rows explain their absence", () => {
    render(
      <ProgramHeadPloSummary
        sources={{ ...EMPTY_SOURCES, COURSE_STUDENT: [evidenceRow()] }}
        ploCatalog={[
          { id: "plo-1", code: "PLO 1" },
          { id: "plo-2", code: "PLO 2" },
        ]}
        programId={PROGRAM_ID}
        periodFilters={{}}
      />
    );

    const row = screen.getByRole("link", { name: "PLO 1" }).closest("div")?.parentElement;
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByRole("button", { name: "How calculated: PLO 1" })).toBeInTheDocument();

    // Catalog PLOs without evidence still disclose that nothing contributed.
    const emptyRow = screen.getByRole("link", { name: "PLO 2" }).closest("div")?.parentElement;
    fireEvent.click(within(emptyRow as HTMLElement).getByRole("button", { name: "How calculated: PLO 2" }));
    expect(
      screen.getByText("No evidence from this source for this Program Learning Outcome in the selected period.")
    ).toBeInTheDocument();
  });
});
