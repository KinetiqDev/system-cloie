import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";

const { notFoundMock, dashboardMock, wordCloudPropsMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  dashboardMock: vi.fn(),
  wordCloudPropsMock: vi.fn<(props: { tokens: Array<{ length: number }> }) => null>(() => null),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/features/analytics/services/get-program-head-dashboard", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/features/analytics/services/get-program-head-dashboard")
  >();
  return { ...actual, getProgramHeadDashboard: dashboardMock };
});
vi.mock("@/features/analytics/components/qualitative-word-cloud", () => ({
  QualitativeWordCloud: wordCloudPropsMock,
}));

import SelectedProgramDashboardPage from "@/app/(app)/program-head/programs/[programId]/dashboard/page";
import type { ProgramHeadDashboardData } from "@/features/analytics/services/get-program-head-dashboard";
import type { ParticipationSummary } from "@/features/analytics/aggregators/types";

const STAKEHOLDER = {
  STUDENT: "STUDENT",
  ALUMNI: "ALUMNI",
  INDUSTRY_PARTNER: "INDUSTRY_PARTNER",
} as const;

function participationFixture(): ParticipationSummary {
  return {
    assigned: 400,
    submitted: 312,
    inProgress: 34,
    notStarted: 54,
    completionRate: 0.78,
    stakeholders: [
      {
        stakeholder: STAKEHOLDER.STUDENT,
        assigned: 340,
        submitted: 265,
        inProgress: 28,
        notStarted: 47,
        completionRate: 0.779,
      },
      {
        stakeholder: STAKEHOLDER.ALUMNI,
        assigned: 35,
        submitted: 27,
        inProgress: 3,
        notStarted: 5,
        completionRate: 0.771,
      },
      {
        stakeholder: STAKEHOLDER.INDUSTRY_PARTNER,
        assigned: 25,
        submitted: 20,
        inProgress: 3,
        notStarted: 2,
        completionRate: 0.8,
      },
    ],
    respondents: { total: 231, complete: 184, partial: 31, notStarted: 16 },
  };
}

function ploRow(overrides: Partial<ProgramHeadDashboardData["ploSources"]["COURSE_STUDENT"][number]>) {
  return {
    ploId: "plo-x",
    ploCode: "PLO X",
    mean: null,
    ratingCount: 0,
    responseCount: 0,
    evaluationCount: 0,
    contributorCount: 0,
    contributorKind: "cilos" as const,
    spansMultipleScales: false,
    scaleMax: null,
    hasEvidence: false,
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
    pendingResponses: 88,
    activeEvaluations: { total: 12, closingWithin7Days: 3 },
    sourceMeans: [
      {
        sourceKey: "COURSE_STUDENT",
        label: "Course evaluations",
        mean: 4.18,
        ratingCount: 1240,
        spansMultipleScales: false,
        scaleMax: 5,
      },
      {
        sourceKey: "CENTRAL_STUDENT",
        label: "Program-wide students",
        mean: null,
        ratingCount: 310,
        spansMultipleScales: true,
        scaleMax: null,
      },
      {
        sourceKey: "ALUMNI",
        label: "Alumni",
        mean: null,
        ratingCount: 0,
        spansMultipleScales: false,
        scaleMax: null,
      },
      {
        sourceKey: "INDUSTRY_PARTNER",
        label: "Industry Partners",
        mean: null,
        ratingCount: 0,
        spansMultipleScales: false,
        scaleMax: null,
      },
    ],
    ploSources: {
      COURSE_STUDENT: [
        ploRow({
          ploId: "plo-1",
          ploCode: "PLO 1",
          mean: 4.42,
          ratingCount: 614,
          responseCount: 163,
          evaluationCount: 8,
          contributorCount: 11,
          contributorKind: "cilos",
          scaleMax: 5,
          hasEvidence: true,
        }),
      ],
      CENTRAL_STUDENT: [],
      ALUMNI: [],
      INDUSTRY_PARTNER: [],
    },
    ploCatalog: [
      { id: "plo-1", code: "PLO 1" },
      { id: "plo-2", code: "PLO 2" },
    ],
    needsAttention: [
      {
        id: "closing-soon:course:cb-1",
        rule: "closing-soon",
        title: "EDUC 7 Evaluation closes soon",
        note: "Deadline within 7 days",
        href: "/program-head/programs/p1/responses/course/cb-1",
      },
      {
        id: "zero-plo-ratings:ALUMNI:plo-2",
        rule: "zero-plo-ratings",
        title: "PLO 2 has no ratings yet",
        note: "No Alumni ratings in this period",
        href: "/program-head/programs/p1/analytics?tab=outcomes",
      },
    ],
    qualitative: {
      respondentCount: 12,
      answerCount: 15,
      evaluationCount: 4,
      sourceCounts: [
        { sourceKey: "COURSE_STUDENT" as const, label: "Course-bound student evidence", count: 9 },
        { sourceKey: "ALUMNI" as const, label: "Alumni evidence", count: 6 },
      ],
      tokens: Array.from({ length: 40 }, (_, index) => ({
        text: `word${index}`,
        value: 40 - index,
      })),
    },
    links: {
      responses: "/program-head/programs/p1/responses",
      responsesActiveCourse: "/program-head/programs/p1/responses?status=ACTIVE",
      responsesActiveProgramWide: "/program-head/programs/p1/responses?tab=program-wide&status=ACTIVE",
      analyticsOutcomes: "/program-head/programs/p1/analytics?tab=outcomes",
      analyticsStakeholders: "/program-head/programs/p1/analytics?tab=stakeholders",
      analyticsFeedback: "/program-head/programs/p1/analytics?tab=feedback",
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
  });

  it("defaults to an empty filter set so the service resolves the active academic period", async () => {
    await loadPage();
    expect(dashboardMock).toHaveBeenCalledWith("p1", {});
  });

  it("renders the completion KPI over the raw assignment denominator with a breakdown popover", async () => {
    await loadPage();
    const card = screen.getByText("Response completion").closest<HTMLElement>("[data-slot=card]")!;
    expect(within(card).getByText("78%")).toBeInTheDocument();
    expect(
      within(card).getByText(/312 of 400 eligible evaluation assignments submitted/)
    ).toBeInTheDocument();
    expect(
      within(card).getByRole("button", { name: "Completion by stakeholder" })
    ).toBeInTheDocument();
  });

  it("renders person-level respondent statuses from the shared participation summary", async () => {
    await loadPage();
    const card = screen
      .getByText("Respondents", { selector: "[data-slot=card-description]" })
      .closest<HTMLElement>("[data-slot=card]")!;
    expect(within(card).getByText("231")).toBeInTheDocument();
    for (const [label, value] of [
      ["Complete", "184"],
      ["Partial", "31"],
      ["Not started", "16"],
    ] as const) {
      const dt = within(card).getByText(label, { selector: "dt" });
      expect(dt.nextElementSibling!.textContent).toBe(value);
    }
  });

  it("keeps quantitative source means separate with the Multiple scales fallback", async () => {
    await loadPage();
    expect(screen.getByText("4.18 / 5")).toBeInTheDocument();
    expect(screen.getByText("Multiple scales")).toBeInTheDocument();
  });

  it("exposes keyboard-operable stakeholder progress rows with counts and percentage", async () => {
    await loadPage();
    const row = screen.getByRole("link", { name: /Students: 265 of 340 submitted/ });
    expect(row).toHaveAttribute("href", "/program-head/programs/p1/analytics?tab=stakeholders");
    expect(within(row).getByText("78%")).toBeInTheDocument();
    expect(within(row).getByText("265 / 340")).toBeInTheDocument();
  });

  it("links the active evaluations card into Responses with the ACTIVE status filter", async () => {
    await loadPage();
    const card = screen.getByText("Active evaluations").closest<HTMLElement>("[data-slot=card]")!;
    const courseLink = within(card).getByRole("link", { name: "Review active course evaluations" });
    const programWideLink = within(card).getByRole("link", {
      name: "Review active program-wide evaluations",
    });
    expect(courseLink).toHaveAttribute("href", "/program-head/programs/p1/responses?status=ACTIVE");
    expect(programWideLink).toHaveAttribute(
      "href",
      "/program-head/programs/p1/responses?tab=program-wide&status=ACTIVE"
    );
    expect(within(card).getByText(/3 close within the next 7 days/)).toBeInTheDocument();
    expect(within(card).getByText(/88 assignments still open/)).toBeInTheDocument();
  });

  it("switches PLO evidence sources client-side without attainment status", async () => {
    await loadPage();
    expect(screen.getByText("4.42")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Alumni" }));

    // The course-source mean disappears with its source; catalog rows remain listed.
    expect(screen.queryByText("4.42")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Course CILO" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByRole("button", { name: "Alumni" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.queryByText(/Fully Achieved|Mostly Achieved/i)).not.toBeInTheDocument();
  });

  it("exposes per-PLO evidence details with rating/response/evaluation/contributor counts", async () => {
    await loadPage();
    const firstDetails = screen.getAllByText("Evidence details")[0].closest("details")!;
    fireEvent.click(screen.getAllByText("Evidence details")[0]);
    const text = firstDetails.textContent ?? "";
    expect(text).toContain("614 ratings");
    expect(text).toContain("163 responses");
    expect(text).toContain("8 evaluations");
    expect(text).toContain("11 contributing CILOs");
  });

  it("lists needs-attention items with text status labels and canonical links", async () => {
    await loadPage();
    const card = screen.getByText("Needs attention").closest<HTMLElement>("[data-slot=card]")!;
    const links = within(card).getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/program-head/programs/p1/responses/course/cb-1");
    expect(within(card).getAllByText("Closing soon")).toHaveLength(1);
    expect(within(card).getAllByText("No ratings")).toHaveLength(1);
  });

  it("caps the qualitative pulse slider at the server-bounded token list", async () => {
    await loadPage();
    const slider = screen.getByRole("slider", { name: /Number of top words shown/ });
    expect(slider).toHaveAttribute("min", "10");
    expect(slider).toHaveAttribute("max", "60");

    const initialCalls = wordCloudPropsMock.mock.calls.length;
    expect(initialCalls).toBeGreaterThan(0);
    const before = (wordCloudPropsMock.mock.calls[initialCalls - 1][0] as unknown as { tokens: unknown[] }).tokens.length;
    expect(before).toBe(30);

    fireEvent.change(slider, { target: { value: "10" } });
    const calls = wordCloudPropsMock.mock.calls;
    expect(calls[calls.length - 1][0].tokens).toHaveLength(10);
  });

  it("links the qualitative pulse into the Feedback analytics tab", async () => {
    await loadPage();
    expect(screen.getByRole("link", { name: "Open qualitative analysis" })).toHaveAttribute(
      "href",
      "/program-head/programs/p1/analytics?tab=feedback"
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
