import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  GeneralEducationAnalyticsFrameDTO,
  GeneralEducationCourseBreakdownRow,
  GeneralEducationFeedbackDTO,
  GeneralEducationOutcomesDTO,
  GeneralEducationProgramsDTO,
  GeneralEducationTrendsDTO,
} from "@/features/analytics/general-education-analytics-types";

const NOT_FOUND = "NEXT_NOT_FOUND";
const { notFoundMock, redirectMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error(NOT_FOUND);
  }),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

const reads = vi.hoisted(() => ({
  frame: vi.fn(),
  outcomes: vi.fn(),
  courses: vi.fn(),
  programs: vi.fn(),
  trends: vi.fn(),
  feedback: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/gen-ed-coordinator/analytics",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/features/analytics/services/general-education-analytics", () => ({
  getGeneralEducationAnalyticsFrame: reads.frame,
  getGeneralEducationOutcomes: reads.outcomes,
  getGeneralEducationCourses: reads.courses,
  getGeneralEducationPrograms: reads.programs,
  getGeneralEducationTrends: reads.trends,
  getGeneralEducationFeedback: reads.feedback,
}));

// Each view keeps its own inline AI request, which needs a server action the
// test does not exercise; the deterministic evidence below is the subject.
vi.mock("@/features/analytics/components/general-education-inline-ai-insight", () => ({
  GeneralEducationInlineAiInsight: () => <div>AI insight</div>,
}));

vi.mock("@/features/analytics/components/general-education-analytics-visualizations", () => ({
  LazyGeneralEducationScaleMeanChart: () => <div>scale-mean chart</div>,
  LazyGeneralEducationResponseRateChart: () => <div>response-rate chart</div>,
  LazyGeneralEducationDistributionChart: () => <div>distribution chart</div>,
  LazyGeneralEducationTrendChart: () => <div>trend chart</div>,
  LazyGeneralEducationResponseRateTrendChart: () => <div>response-rate trend chart</div>,
  LazyGeneralEducationAlignmentChart: () => <div>alignment chart</div>,
  LazyOutcomeMeanBarChart: () => <div>outcome mean chart</div>,
  LazyQualitativeWordCloud: () => <div>word cloud</div>,
}));

import GenEdCoordinatorAnalyticsPage from "../../app/(app)/gen-ed-coordinator/analytics/page";

const TERM = "11111111-1111-4111-8111-111111111111";
const COURSE = "22222222-2222-4222-8222-222222222222";

const FRAME: GeneralEducationAnalyticsFrameDTO = {
  scope: { periodLabel: "2026-2027 · 1st Semester · 1st Term" },
  kpi: {
    submittedResponseCount: 10,
    evaluationOpportunityCount: 20,
    responseRate: 0.5,
    ratingCount: 30,
    meanRating: 4.25,
    spansMultipleScales: false,
    scaleContext: "1–5 (5-point)",
    excludedRatingCount: 0,
  },
  emptyReason: null,
  options: {
    schoolYears: [{ id: "33333333-3333-4333-8333-333333333333", label: "2026-2027" }],
    semesters: [{ value: "FIRST", label: "1st Semester" }],
    termInstances: [
      {
        id: TERM,
        schoolYearId: "33333333-3333-4333-8333-333333333333",
        schoolYearLabel: "2026-2027",
        semester: "FIRST",
        semesterLabel: "1st Semester",
        termLabel: "1st Term",
        label: "2026-2027 · 1st Semester · 1st Term",
      },
    ],
    courses: [{ id: COURSE, label: "GEETHICS — Ethics" }],
    programs: [],
    yearLevels: [{ value: "SECOND_YEAR", label: "2nd Year" }],
    ilos: [],
  },
};

// Minimal row: the route test proves which read runs and which view renders,
// so it carries no evidence detail the assertions do not read.
const COURSE_ROW: GeneralEducationCourseBreakdownRow = {
  courseId: COURSE,
  courseCode: "GEETHICS",
  courseTitle: "Ethics",
  sectionCount: 1,
  programCount: 1,
  evaluationOpportunityCount: 4,
  submittedResponseCount: 4,
  responseRate: 1,
  meanRating: 4.5,
  ratingCount: 4,
  excludedRatingCount: 0,
  spansMultipleScales: false,
  instrumentContext: null,
  scaleGroups: [],
  alignedIlos: [],
  previousComparable: null,
  evidenceEvaluations: [],
  sections: [],
};

const OUTCOMES: GeneralEducationOutcomesDTO = {
  emptyReason: "no-mapped-outcomes",
  outcomes: [],
  currentMappingDisclosure: "Grouped by current mappings.",
  manyToManyDisclosure: false,
  unlinkedRatings: { generalItems: 0, unmappedCilos: 0 },
  alignmentCoverage: [],
  courseMatrix: [],
};

const COURSES = { emptyReason: null, rows: [COURSE_ROW] };

const PROGRAMS: GeneralEducationProgramsDTO = {
  emptyReason: null,
  attributionNote: "Program attribution note.",
  rows: [],
  courseMatrix: [],
};

const TRENDS: GeneralEducationTrendsDTO = {
  periods: [
    {
      termInstanceId: TERM,
      periodLabel: "2026-2027 · 1st Semester · 1st Term",
      meanRating: 4.25,
      submittedResponseCount: 10,
      evaluationOpportunityCount: 20,
      responseRate: 0.5,
      ratingCount: 30,
      instrumentContext: "Five-point instrument",
      scaleContext: "1–5 (5-point)",
      scaleDomain: [1, 5],
      outcomeCodes: [],
      comparableWithPrevious: false,
    },
  ],
  breaks: [],
  emptyReason: null,
};

const FEEDBACK: GeneralEducationFeedbackDTO = {
  emptyReason: null,
  tokens: [{ text: "relevant", value: 4, responseCount: 3 }],
  tone: { scoredItemCount: 4, positive: 3, neutral: 1, negative: 0 },
  qualitativeItemCount: 4,
  qualitativeResponseCount: 4,
  sourceLabel: "General Education course evidence",
  promptCounts: [],
  evidenceEvaluations: [],
};

async function renderRoute(searchParams: Record<string, string | string[] | undefined> = {}) {
  render(
    await GenEdCoordinatorAnalyticsPage({
      searchParams: Promise.resolve(searchParams),
    })
  );
}

describe("gen-ed-coordinator analytics route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reads.frame.mockResolvedValue(FRAME);
    reads.outcomes.mockResolvedValue(OUTCOMES);
    reads.courses.mockResolvedValue(COURSES);
    reads.programs.mockResolvedValue(PROGRAMS);
    reads.trends.mockResolvedValue(TRENDS);
    reads.feedback.mockResolvedValue(FEEDBACK);
  });

  afterEach(cleanup);

  it.each([
    // `outcomes` is the default tab, so its canonical URL carries no `tab`.
    ["outcomes", {}, "Outcomes", reads.outcomes, "No mapped ILO evidence"],
    [
      "courses",
      { courseId: COURSE },
      "Courses",
      reads.courses,
      "Exact values by General Education course",
    ],
    [
      "programs",
      { courseId: COURSE },
      "Programs",
      reads.programs,
      "No program attribution in this scope",
    ],
    ["trends", { courseId: COURSE }, "Trends", reads.trends, "Exact values by academic period"],
    [
      "qualitative",
      { courseId: COURSE },
      "Written feedback",
      reads.feedback,
      "Most-mentioned terms",
    ],
  ] as const)(
    "resolves the %s view through its own re-authorized read",
    async (tab, scope, label, read, evidence) => {
      // `outcomes` arrives at its default through the bare path; every other
      // view names its tab explicitly.
      await renderRoute(tab === "outcomes" ? scope : { tab, ...scope });

      expect(read).toHaveBeenCalledWith({ tab, ...scope });
      // Beside the frame, only the routed view reads evidence.
      for (const [name, other] of Object.entries(reads)) {
        if (name !== "frame" && other !== read) expect(other).not.toHaveBeenCalled();
      }
      expect(screen.getByRole("region", { name: `${label} evidence` })).toBeInTheDocument();
      expect(screen.getByText(evidence)).toBeInTheDocument();
    }
  );

  it("redirects to the canonical query instead of rendering a non-canonical scope", async () => {
    // `tab=outcomes` is the default, so the canonical URL drops it; key order
    // is fixed, so a reordered but equivalent query also redirects.
    await expect(renderRoute({ courseId: COURSE, tab: "outcomes" })).rejects.toThrow(
      "NEXT_REDIRECT:/gen-ed-coordinator/analytics?courseId=22222222-2222-4222-8222-222222222222"
    );

    // Neither the frame nor any view read runs for a non-canonical URL.
    expect(reads.frame).not.toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledTimes(1);
  });

  it("renders the default view at the bare path without redirecting", async () => {
    await renderRoute({});

    expect(redirectMock).not.toHaveBeenCalled();
    expect(reads.outcomes).toHaveBeenCalledWith({ tab: "outcomes" });
    expect(screen.getByRole("region", { name: "Outcomes evidence" })).toBeInTheDocument();
  });

  it("keeps every scope facet on the routed view", async () => {
    await renderRoute({
      tab: "courses",
      termInstanceId: TERM,
      courseId: COURSE,
      yearLevel: "SECOND_YEAR",
    });

    expect(reads.courses).toHaveBeenCalledWith({
      tab: "courses",
      termInstanceId: TERM,
      courseId: COURSE,
      yearLevel: "SECOND_YEAR",
    });
  });

  it.each([
    ["outcomes", {}, reads.outcomes],
    ["courses", { courseId: COURSE }, reads.courses],
    ["programs", { courseId: COURSE }, reads.programs],
    ["trends", { courseId: COURSE }, reads.trends],
    ["qualitative", { courseId: COURSE }, reads.feedback],
  ] as const)("returns 404 when the %s view cannot be authorized", async (tab, scope, read) => {
    read.mockResolvedValue(null);

    await expect(renderRoute(tab === "outcomes" ? scope : { tab, ...scope })).rejects.toThrow(
      NOT_FOUND
    );
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("returns 404 when the shared frame cannot be read", async () => {
    reads.frame.mockResolvedValue(null);

    await expect(renderRoute({ tab: "courses", courseId: COURSE })).rejects.toThrow(NOT_FOUND);
    // The view read still ran in parallel; only the frame gates the render.
    expect(reads.courses).toHaveBeenCalled();
  });
});
