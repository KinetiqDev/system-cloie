import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import type * as DashboardService from "@/features/analytics/services/get-program-head-dashboard";

const { notFoundMock, dashboardMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  dashboardMock: vi.fn(),
}));

vi.mock("@/features/course-assignments/components/program-assignment-summary", () => ({
  ProgramAssignmentSummary: () => <div>Course assignments</div>,
}));
vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@isoterik/react-word-cloud", () => ({
  WordCloud: () => <div />,
}));
vi.mock("@/features/analytics/services/get-program-head-dashboard", async (importOriginal) => ({
  ...(await importOriginal<typeof DashboardService>()),
  getProgramHeadDashboard: dashboardMock,
}));

import SelectedProgramDashboardPage from "@/app/(app)/program-head/programs/[programId]/dashboard/page";
import type {
  DashboardPoRow,
  ProgramHeadDashboardData,
} from "@/features/analytics/services/get-program-head-dashboard";
import type { ParticipationSummary } from "@/features/analytics/aggregators/types";
import { classifyOutcomeMean } from "@/features/analytics/aggregators/outcome-attainment";

function participationFixture(): ParticipationSummary {
  return {
    assigned: 400,
    submitted: 312,
    inProgress: 34,
    notStarted: 54,
    completionRate: 0.78,
    stakeholders: [
      {
        stakeholder: "STUDENT",
        assigned: 340,
        submitted: 265,
        inProgress: 28,
        notStarted: 47,
        completionRate: 0.779,
        respondentCount: 205,
      },
      {
        stakeholder: "ALUMNI",
        assigned: 35,
        submitted: 27,
        inProgress: 3,
        notStarted: 5,
        completionRate: 0.771,
        respondentCount: 18,
      },
    ],
    respondents: { total: 231, complete: 184, partial: 31, notStarted: 16 },
  };
}

function poRow(overrides: Partial<DashboardPoRow>): DashboardPoRow {
  return {
    poId: "po-x",
    poCode: "PO X",
    mean: null,
    spansMultipleScales: false,
    scaleMax: null,
    hasEvidence: false,
    attainment: classifyOutcomeMean(null, null),
    ...overrides,
  };
}

function dashboardDataFixture(
  overrides: Partial<ProgramHeadDashboardData> = {}
): ProgramHeadDashboardData {
  return {
    programLabel: "Bachelor of Secondary Education",
    programCode: "BSED",
    periodLabel: "School Year 2026-2027 · 1st Semester",
    participation: participationFixture(),
    activeEvaluations: { total: 12, closingWithin7Days: 3 },
    poSources: {
      COURSE_STUDENT: [
        poRow({ poId: "po-1", poCode: "PO 1", mean: 4.42, scaleMax: 5, hasEvidence: true }),
      ],
      CENTRAL_STUDENT: [],
      ALUMNI: [],
      INDUSTRY_PARTNER: [],
    },
    poCatalog: [
      { id: "po-1", code: "PO 1" },
      { id: "po-2", code: "PO 2" },
    ],
    needsAttention: [
      {
        id: "deployment:course:cb-1",
        rules: ["closing-soon"],
        title: "EDUC 7 Evaluation",
        note: "Closes within 7 days",
        href: "/program-head/programs/p1/responses/course/cb-1",
      },
      {
        id: "zero-po-ratings:ALUMNI",
        rules: ["zero-po-ratings"],
        title: "No ratings from Alumni",
        note: "PO 2",
        href: "/program-head/programs/p1/analytics?tab=outcomes&evidenceSource=ALUMNI",
      },
    ],
    qualitative: {
      respondentCount: 12,
      answerCount: 15,
      tokens: Array.from({ length: 40 }, (_, index) => ({
        text: `word${index}`,
        value: 40 - index,
      })),
    },
    links: {
      responses: "/program-head/programs/p1/responses",
      responsesActiveCourse: "/program-head/programs/p1/responses?status=ACTIVE",
      analyticsOutcomes: "/program-head/programs/p1/analytics?tab=outcomes",
      analyticsStakeholders: "/program-head/programs/p1/analytics?tab=stakeholders",
      analyticsFeedback: "/program-head/programs/p1/analytics?tab=qualitative",
    },
    ...overrides,
  };
}

async function loadPage(searchParams: Record<string, string> = {}) {
  const component = await SelectedProgramDashboardPage({
    params: Promise.resolve({ programId: "p1" }),
    searchParams: Promise.resolve(searchParams),
  });
  render(<>{component}</>);
}

const kpi = (label: string) =>
  within(screen.getByRole("region", { name: "Key figures" }))
    .getByText(label)
    .closest("a")!;

describe("selected Program dashboard route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dashboardMock.mockResolvedValue(dashboardDataFixture());
  });

  it("renders no data when the service denies the selected Program", async () => {
    dashboardMock.mockResolvedValue(null);
    await expect(loadPage()).rejects.toThrow("NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("passes Analytics-compatible period filters to the read and labels the period", async () => {
    await loadPage({ termInstanceId: "00000000-0000-4000-8000-000000000001" });
    expect(dashboardMock).toHaveBeenCalledWith("p1", {
      termInstanceId: "00000000-0000-4000-8000-000000000001",
    });
    expect(screen.getByText(/School Year 2026-2027 · 1st Semester/)).toBeInTheDocument();
    expect(screen.getByText(/Selected Academic Period/)).toBeInTheDocument();
  });

  it("defaults to an empty filter set so the service resolves the active academic period", async () => {
    await loadPage();
    expect(dashboardMock).toHaveBeenCalledWith("p1", {});
  });

  it("shows when no active academic period is configured", async () => {
    dashboardMock.mockResolvedValue(dashboardDataFixture({ periodLabel: null }));
    await loadPage();
    expect(screen.getByText("No active Academic Period")).toBeInTheDocument();
  });

  it("states completion over the raw assignment denominator", async () => {
    await loadPage();
    const card = kpi("Response completion");
    expect(card).toHaveTextContent("78%");
    expect(card).toHaveTextContent("312 of 400 submitted");
    expect(card).toHaveAttribute("href", "/program-head/programs/p1/analytics?tab=stakeholders");
  });

  it("states person-level respondent statuses on one line", async () => {
    await loadPage();
    const card = kpi("Respondents");
    expect(card).toHaveTextContent("231");
    expect(card).toHaveTextContent("184 complete · 31 partial · 16 not started");
  });

  it("links active evaluations into Responses filtered to ACTIVE", async () => {
    await loadPage();
    const card = kpi("Active evaluations");
    expect(card).toHaveTextContent("12");
    expect(card).toHaveTextContent("3 close within 7 days");
    expect(card).toHaveAttribute("href", "/program-head/programs/p1/responses?status=ACTIVE");
  });

  it("carries no how-calculated popovers on the landing page", async () => {
    await loadPage();
    expect(screen.queryByRole("button", { name: /How calculated/ })).not.toBeInTheDocument();
  });

  it("places Response progress before Needs attention in reading order", async () => {
    await loadPage();
    const progress = screen.getByRole("heading", { name: "Response progress" });
    const attention = screen.getByRole("heading", { name: /Needs attention/ });
    expect(
      progress.compareDocumentPosition(attention) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("reconciles assignment progress with distinct respondent counts per stakeholder", async () => {
    await loadPage();
    const row = screen.getByRole("link", {
      name: /Students: 205 respondents, 265 of 340 assignments submitted/,
    });
    expect(row).toHaveAttribute("href", "/program-head/programs/p1/analytics?tab=stakeholders");
    expect(row).toHaveTextContent("78%");
    expect(row).toHaveTextContent("265/340");
  });

  it("switches PO evidence sources client-side and keeps catalog rows", async () => {
    await loadPage();
    expect(screen.getByRole("link", { name: /^PO 1: mean 4\.42/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Alumni" }));

    expect(screen.getByRole("button", { name: "Alumni" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: "PO 1: mean —, no evidence" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "PO 2: mean —, no evidence" })).toBeInTheDocument();
  });

  it("keeps the attainment interpretation guide one disclosure away", async () => {
    await loadPage();
    const guide = screen.getByText("How ratings are classified").closest("details")!;
    expect(guide).not.toHaveAttribute("open");
    expect(within(guide).getByText("Fully Attained")).toBeInTheDocument();
  });

  it("lists needs-attention items with text labels and canonical links", async () => {
    await loadPage();
    const heading = screen.getByRole("heading", { name: /Needs attention/ });
    const card = heading.closest<HTMLElement>("[data-slot=card]")!;
    const links = within(card).getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/program-head/programs/p1/responses/course/cb-1");
    expect(links[0]).toHaveTextContent("Closes within 7 days");
    expect(links[1]).toHaveTextContent("No ratings from Alumni");
  });

  it("summarizes written feedback as an interactive word cloud and links to qualitative analysis", async () => {
    await loadPage();
    expect(screen.getByText("15 answers from 12 respondents")).toBeInTheDocument();
    expect(await screen.findByText("40 terms from 15 qualitative answers")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /Words shown in the cloud/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ranked" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open qualitative analysis" })).toHaveAttribute(
      "href",
      "/program-head/programs/p1/analytics?tab=qualitative"
    );
  });

  it("links header actions into Responses and Analytics", async () => {
    await loadPage();
    expect(screen.getByRole("link", { name: "View Responses" })).toHaveAttribute(
      "href",
      "/program-head/programs/p1/responses"
    );
    expect(screen.getByRole("link", { name: /Open Analytics/ })).toHaveAttribute(
      "href",
      "/program-head/programs/p1/analytics?tab=outcomes"
    );
  });
});
