// fallow-ignore-file code-duplication
import { cleanup, render, screen, within } from "@testing-library/react";
import { Suspense } from "react";
import React from "react";
import { renderToReadableStream } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeanDashboardPage, { DeanDashboardContent } from "@/features/dean/components/dashboard-page";
import { DeanDashboardLoading } from "@/features/dean/components/dean-oversight-loading";
import {
  LearningOutcomesContent,
  LearningOutcomesViewTabs,
  ReadinessView,
  resolveLearningOutcomesTab,
} from "@/features/dean/components/learning-outcomes-page";
import { COLLEGE_OVERSIGHT_ROUTES } from "@/lib/constants/college-oversight";

/** The readiness tab as the Dean route renders it, resolved like the server would. */
async function DeanLearningOutcomesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return ReadinessView({ params: await searchParams, routes: COLLEGE_OVERSIGHT_ROUTES.DEAN });
}

const { listDeanEligiblePeriodsMock, getDeanLearningOutcomesMock, getDeanDashboardMock } =
  vi.hoisted(() => ({
    listDeanEligiblePeriodsMock: vi.fn(),
    getDeanLearningOutcomesMock: vi.fn(),
    getDeanDashboardMock: vi.fn(),
  }));
const notFoundMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NOT_FOUND");
  })
);
const redirectMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  })
);

vi.mock("next/navigation", () => ({ notFound: notFoundMock, redirect: redirectMock }));

vi.mock("@/features/dean/services/dean-read-model", () => ({
  DeanReadModelNotFoundError: class DeanReadModelNotFoundError extends Error {},
  listDeanEligiblePeriods: listDeanEligiblePeriodsMock,
}));
vi.mock("@/features/dean/services/read-dean-learning-outcomes", () => ({
  getDeanLearningOutcomes: getDeanLearningOutcomesMock,
}));
vi.mock("@/features/outcomes/services/manage-central-outcomes", () => ({
  readCentralOutcomeAdministration: vi.fn(() => new Promise(() => undefined)),
}));
vi.mock("@/features/outcomes/components/central-outcomes-catalog", () => ({
  CentralOutcomesCatalog: () => null,
}));
vi.mock("@/features/dean/services/read-dean-dashboard", () => ({
  getDeanDashboard: getDeanDashboardMock,
}));

const PERIOD_ID = "11111111-1111-4111-8111-111111111111";
const PROGRAM_ID = "22222222-2222-4222-8222-222222222222";

const period = {
  id: PERIOD_ID,
  label: "2025-2026 — 1st Semester — 1st Term",
  status: "ACTIVE" as const,
};
const outcomeData = {
  period,
  risk: null,
  schemaVersion: 2,
  institutionalOutcomes: [
    {
      id: "ilo-1",
      code: "ILO1",
      statement: "Serve the community",
      isArchived: false,
      displayOrder: 0,
    },
    {
      id: "ilo-2",
      code: "ILO2",
      statement: "Retired shared outcome",
      isArchived: true,
      displayOrder: 1,
    },
  ],
  programs: [
    {
      id: PROGRAM_ID,
      name: "Computer Science",
      poCount: 2,
      activeContexts: 3,
      readyContexts: 2,
      missingCiloContexts: 0,
      incompleteMappingContexts: 1,
      pos: [
        { id: "po-1", code: "PO1", statement: "Build systems", isArchived: false, displayOrder: 1 },
        { id: "po-2", code: "PO2", statement: "Lead change", isArchived: true, displayOrder: 2 },
      ],
      mappingGaps: [
        {
          courseId: "course-ge",
          courseCode: "GE101",
          courseName: "Ethics",
          courseScope: "GENERAL_EDUCATION" as const,
          targetType: "INSTITUTIONAL_OUTCOME" as const,
          yearLevel: "FIRST_YEAR",
          section: "AFTERNOON",
          ciloId: "cilo-ge",
          ciloStatement: "Examine civic duty",
          ciloIsArchived: false,
          reason: "incomplete-mapping" as const,
          missingGoIds: [],
          missingInstitutionalOutcomeIds: ["ilo-1"],
        },
        {
          courseId: "course-ge-common",
          courseCode: "GE201",
          courseName: "Common Mode Seminar",
          courseScope: "GENERAL_EDUCATION" as const,
          targetType: "COMMON_PROGRAM_OUTCOME" as const,
          yearLevel: "SECOND_YEAR",
          section: "EVENING",
          ciloId: "cilo-ge-common",
          ciloStatement: "Relate discipline to civic life",
          ciloIsArchived: false,
          reason: "incomplete-mapping" as const,
          missingGoIds: [],
          missingInstitutionalOutcomeIds: [],
          missingCommonOutcomeIds: ["common-1"],
        },
        {
          courseId: "course-1",
          courseCode: "CS101",
          courseName: "Foundations",
          courseScope: "PROFESSIONAL" as const,
          targetType: "GRADUATE_OUTCOME" as const,
          yearLevel: "FIRST_YEAR",
          section: "MORNING",
          ciloId: "cilo-1",
          ciloStatement: "Explain core ideas",
          ciloIsArchived: false,
          reason: "incomplete-mapping" as const,
          missingGoIds: ["po-2"],
          missingInstitutionalOutcomeIds: [],
        },
      ],
    },
  ],
};

describe("Dean oversight pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listDeanEligiblePeriodsMock.mockResolvedValue([
      period,
      {
        ...period,
        id: "33333333-3333-4333-8333-333333333333",
        status: "COMPLETED",
        label: "2024-2025 — 2nd Semester — 2nd Term",
      },
    ]);
    getDeanLearningOutcomesMock.mockResolvedValue({ state: "ready", data: outcomeData });
  });

  function expectDirectReadCalls() {
    expect(listDeanEligiblePeriodsMock).not.toHaveBeenCalled();
    expect(getDeanLearningOutcomesMock).not.toHaveBeenCalled();
  }

  it("starts the dashboard read inside its local Suspense boundary", () => {
    getDeanDashboardMock.mockReturnValue(new Promise(() => undefined));

    const page = DeanDashboardPage();
    const suspense = page.props.children[1];

    expect(getDeanDashboardMock).toHaveBeenCalledTimes(1);
    expect(suspense.type).toBe(Suspense);
    expect(suspense.props.fallback.type).toBe(DeanDashboardLoading);
  });

  it("streams the dashboard shell before its pending read resolves", async () => {
    let resolveDashboard!: (value: unknown) => void;
    getDeanDashboardMock.mockReturnValue(
      new Promise((resolve) => {
        resolveDashboard = resolve;
      })
    );

    const stream = await renderToReadableStream(React.createElement(DeanDashboardPage));
    const reader = stream.getReader();
    const firstChunk = await reader.read();
    const decoder = new TextDecoder();
    let html = decoder.decode(firstChunk.value);

    expect(html).toContain("Dean Dashboard");
    expect(html).toContain("Loading readiness details");

    resolveDashboard({
      state: "ready",
      data: {
        activePeriod: { id: PERIOD_ID, label: period.label },
        kpis: {
          activeContexts: 3,
          readyContexts: 2,
          missingCiloContexts: 0,
          incompleteMappingContexts: 1,
        },
        risks: { missingCilos: 0, incompleteMappings: 1, notReady: 1 },
        programs: [],
      },
    });

    while (!firstChunk.done) {
      const chunk = await reader.read();
      html += decoder.decode(chunk.value);
      if (chunk.done) break;
    }
    expect(html).toContain("Readiness at a glance");
    expect(html).toContain('id="S:0"');
  });

  it("renders Dashboard KPIs, count-only risks, coverage matrix, and same-period links", async () => {
    getDeanDashboardMock.mockResolvedValue({
      state: "ready",
      data: {
        activePeriod: { id: PERIOD_ID, label: period.label },
        kpis: {
          activeContexts: 3,
          readyContexts: 2,
          missingCiloContexts: 0,
          incompleteMappingContexts: 1,
        },
        risks: { missingCilos: 0, incompleteMappings: 1, notReady: 1 },
        programs: [
          {
            id: PROGRAM_ID,
            name: "Computer Science",
            activeContexts: 3,
            readyContexts: 2,
            missingCiloContexts: 0,
            incompleteMappingContexts: 1,
          },
        ],
      },
    });

    render(await DeanDashboardContent({ result: await getDeanDashboardMock() }));

    expect((await screen.findAllByText("Active contexts")).length).toBeGreaterThan(0);
    expect(await screen.findByText("Incomplete mappings")).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Contexts with active CILOs that have no valid active target for their Course scope."
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/do not reach every active Program Outcome/i)
    ).not.toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Incomplete typed mappings/ })).toHaveAttribute(
      "href",
      `/dean/college-oversight/learning-outcomes?tab=readiness&period=${PERIOD_ID}&risk=incomplete-mappings`
    );
    expect(await screen.findByRole("link", { name: "Computer Science" })).toHaveAttribute(
      "href",
      `/dean/college-oversight/learning-outcomes?tab=readiness&period=${PERIOD_ID}&program=${PROGRAM_ID}`
    );
    expect((await screen.findAllByText("67% coverage")).length).toBeGreaterThan(0);
    expect((await screen.findAllByText("Needs attention")).length).toBeGreaterThan(0);
    expect(
      screen.queryByText(/student|evaluation|export|analytics|reports/i)
    ).not.toBeInTheDocument();
  });

  it("reads the dashboard directly from the Dean read service", async () => {
    getDeanDashboardMock.mockResolvedValue({ state: "no-eligible-period" });

    render(await DeanDashboardContent({ result: await getDeanDashboardMock() }));

    expect(getDeanDashboardMock).toHaveBeenCalledTimes(1);
    expectDirectReadCalls();
  });

  it("renders explicit no-active-period state without misleading zeros", async () => {
    getDeanDashboardMock.mockResolvedValue({ state: "no-eligible-period" });
    render(await DeanDashboardContent({ result: await getDeanDashboardMock() }));

    expect(
      await screen.findByRole("heading", { name: "No active Academic Period" })
    ).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.queryByText("Active contexts")).not.toBeInTheDocument();
  });

  it("renders Institutional Outcome catalog before typed mapping gaps", async () => {
    listDeanEligiblePeriodsMock.mockResolvedValue([period]);
    getDeanLearningOutcomesMock.mockResolvedValue({
      state: "ready",
      data: { ...outcomeData, risk: "incomplete-mappings" },
    });
    render(
      await DeanLearningOutcomesPage({
        searchParams: Promise.resolve({
          period: PERIOD_ID,
          risk: "incomplete-mappings",
          program: PROGRAM_ID,
        }),
      })
    );
    expect(screen.getByRole("heading", { name: "Academic Program overview" })).toBeInTheDocument();
    expect(screen.getByText("Risk: Incomplete mappings")).toBeInTheDocument();
    cleanup();
    render(
      <LearningOutcomesContent
        result={await getDeanLearningOutcomesMock()}
        selectedProgram={PROGRAM_ID}
      />
    );

    expect(
      await screen.findByRole("heading", { name: "Institutional Outcomes" })
    ).toBeInTheDocument();
    expect(await screen.findByText("ILO1")).toBeInTheDocument();
    expect(
      (await screen.findByText("ILO1")).compareDocumentPosition(await screen.findByText("PO1")) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(await screen.findByRole("heading", { name: "Program Outcomes" })).toBeInTheDocument();
    expect(screen.queryByText(/Program Learning Outcome/i)).not.toBeInTheDocument();
    expect(
      await screen.findByText(/Incomplete Institutional Outcome mapping:/)
    ).toBeInTheDocument();
    expect(await screen.findByText(/Incomplete Program Outcome mapping:/)).toBeInTheDocument();
    expect(screen.queryByText("missing Program Outcomes")).not.toBeInTheDocument();
    expect(await screen.findAllByText("Archived")).toHaveLength(2);
    expect(
      await screen.findByText(/3 active · 2 ready · 0 missing CILOs · 1 incomplete mapping\b/)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /edit|add|create|archive|restore|reorder/i })
    ).not.toBeInTheDocument();
    expect(getDeanLearningOutcomesMock).toHaveBeenCalledWith(PERIOD_ID, "incomplete-mappings");
  });

  // ADR 0040: a Common-mode General Education context aligns to the shared
  // Common PO catalog, never to a program-owned PO. Its gap must therefore be
  // counted and listed under the Common PO section instead of being absorbed
  // into the Professional Program Outcome gaps.
  it("groups a Common PO gap under the Common section, not Professional POs", async () => {
    render(
      <LearningOutcomesContent
        result={await getDeanLearningOutcomesMock()}
        selectedProgram={PROGRAM_ID}
      />
    );

    const commonSection = screen.getByRole("heading", {
      name: "Common PO mapping gaps",
    }).parentElement as HTMLElement;
    const programGapSection = screen.getByRole("heading", {
      name: "Program Outcome mapping gaps",
    }).parentElement as HTMLElement;

    expect(within(commonSection).getByText("GE201")).toBeInTheDocument();
    expect(
      within(commonSection).getByText(/Incomplete shared Common PO mapping:/)
    ).toBeInTheDocument();
    expect(within(programGapSection).queryByText("GE201")).not.toBeInTheDocument();
    expect(within(programGapSection).getByText("CS101")).toBeInTheDocument();
    expect(screen.queryByText("No General Education Common PO gaps.")).not.toBeInTheDocument();
    // Counts follow the partition, so no layer borrows another's total, and the
    // GO-era wording is gone from the labels this component owns.
    expect(
      await screen.findByText(
        "2 Program Outcomes · 1 Institutional Outcome gap · 1 Common PO gap · 1 Program Outcome gap"
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/Graduate Outcome/i)).not.toBeInTheDocument();
  });

  it("states an empty Common PO gap section when no Common-mode context is a gap", async () => {
    getDeanLearningOutcomesMock.mockResolvedValue({
      state: "ready",
      data: {
        ...outcomeData,
        programs: [
          {
            ...outcomeData.programs[0],
            mappingGaps: outcomeData.programs[0].mappingGaps.filter(
              (gap) => gap.targetType !== "COMMON_PROGRAM_OUTCOME"
            ),
          },
        ],
      },
    });
    render(
      <LearningOutcomesContent
        result={await getDeanLearningOutcomesMock()}
        selectedProgram={PROGRAM_ID}
      />
    );

    const commonSection = screen.getByRole("heading", {
      name: "Common PO mapping gaps",
    }).parentElement as HTMLElement;
    expect(
      within(commonSection).getByText("No General Education Common PO gaps.")
    ).toBeInTheDocument();
    const counts = await screen.findByText(/2 Program Outcomes · 1 Institutional Outcome gap/);
    expect(counts.textContent).toBe(
      "2 Program Outcomes · 1 Institutional Outcome gap · 0 Common PO gaps · 1 Program Outcome gap"
    );
  });

  it("keeps Learning Outcomes heading and period controls visible while details wait", async () => {
    listDeanEligiblePeriodsMock.mockResolvedValue([period]);
    getDeanLearningOutcomesMock.mockReturnValue(new Promise(() => undefined));

    render(
      await DeanLearningOutcomesPage({
        searchParams: Promise.resolve({ period: PERIOD_ID }),
      })
    );

    expect(screen.getByLabelText("Academic Period")).toBeInTheDocument();
    expect(screen.getByLabelText("Loading Learning Outcomes")).toBeInTheDocument();
  });

  it("hides evaluation surfaces from Learning Outcomes", async () => {
    render(
      await DeanLearningOutcomesPage({ searchParams: Promise.resolve({ period: PERIOD_ID }) })
    );

    expect(screen.queryByText(/evaluation|analytics|reports|export/i)).not.toBeInTheDocument();
  });

  it("redirects active period into URL when period is omitted", async () => {
    await expect(DeanLearningOutcomesPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "NEXT_REDIRECT"
    );
    expect(redirectMock).toHaveBeenCalledWith(
      `/dean/college-oversight/learning-outcomes?tab=readiness&period=${PERIOD_ID}`
    );
    expect(listDeanEligiblePeriodsMock).toHaveBeenCalledTimes(1);
  });

  it("renders explicit no-eligible-period state", async () => {
    listDeanEligiblePeriodsMock.mockResolvedValue([]);
    render(await DeanLearningOutcomesPage({ searchParams: Promise.resolve({}) }));
    expect(
      await screen.findByRole("heading", { name: "No active Academic Period" })
    ).toBeInTheDocument();
    expect(listDeanEligiblePeriodsMock).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid risk URL state", async () => {
    await expect(
      DeanLearningOutcomesPage({ searchParams: Promise.resolve({ risk: "scores" }) })
    ).rejects.toThrow("NOT_FOUND");
    expect(listDeanEligiblePeriodsMock).not.toHaveBeenCalled();
  });

  it("rejects an eligible-period ID that is not in the preflight period list", async () => {
    const unavailablePeriodId = "55555555-5555-4555-8555-555555555555";
    listDeanEligiblePeriodsMock.mockResolvedValue([period]);
    getDeanLearningOutcomesMock.mockRejectedValue(new Error("should not reach detail read"));

    await expect(
      DeanLearningOutcomesPage({
        searchParams: Promise.resolve({ period: unavailablePeriodId }),
      })
    ).rejects.toThrow("NOT_FOUND");
    expect(getDeanLearningOutcomesMock).not.toHaveBeenCalled();
  });

  it.each([
    [{}, "catalog"],
    [{ tab: "readiness" }, "readiness"],
    [{ period: PERIOD_ID }, "readiness"],
    [{ risk: "missing-cilos" }, "readiness"],
    [{ program: PROGRAM_ID }, "readiness"],
    [{ tab: "catalog", period: PERIOD_ID }, "catalog"],
  ])("resolves %o to the %s tab", (query, expected) => {
    expect(resolveLearningOutcomesTab(query)).toBe(expected);
  });

  it("marks the active view and keeps both views bookmarkable under the role route", () => {
    render(<LearningOutcomesViewTabs tab="catalog" routes={COLLEGE_OVERSIGHT_ROUTES.SECRETARY} />);
    expect(screen.getByRole("link", { current: "page" })).toHaveTextContent("Outcome catalog");
    expect(screen.getByRole("link", { name: "Outcome catalog" })).toHaveAttribute(
      "href",
      "/secretary/learning-outcomes"
    );
    expect(screen.getByRole("link", { name: "Mapping readiness" })).toHaveAttribute(
      "href",
      "/secretary/learning-outcomes?tab=readiness"
    );
  });

  it("keeps a Secretary on Secretary routes when readiness redirects", async () => {
    listDeanEligiblePeriodsMock.mockResolvedValue([period]);
    await expect(
      ReadinessView({ params: { risk: "not-ready" }, routes: COLLEGE_OVERSIGHT_ROUTES.SECRETARY })
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith(
      `/secretary/learning-outcomes?tab=readiness&period=${PERIOD_ID}&risk=not-ready`
    );
  });
});
