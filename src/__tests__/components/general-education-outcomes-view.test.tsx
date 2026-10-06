import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GeneralEducationOutcomesView } from "@/features/analytics/components/general-education-outcomes-view";
import type {
  GeneralEducationIloEvidenceDTO,
  GeneralEducationOutcomesDTO,
} from "@/features/analytics/general-education-analytics-types";
import type { GeneralEducationAnalyticsFilterState } from "@/features/analytics/services/general-education-analytics-state";

vi.mock("@/features/analytics/components/general-education-inline-ai-insight", () => ({
  GeneralEducationInlineAiInsight: () => <div>AI insight</div>,
}));

const FILTERS = { tab: "outcomes", schoolYearId: "sy-1" } as GeneralEducationAnalyticsFilterState;

function iloDTO(overrides: Partial<GeneralEducationIloEvidenceDTO> = {}) {
  return {
    outcomeId: "ilo-1",
    code: "ILO-1",
    name: "Competence in the discipline",
    isActive: true,
    order: 1,
    meanRating: 4.5,
    ratingCount: 4,
    submittedResponseCount: 2,
    contributingCilos: [{ id: "cilo-1", description: "Explain ethical reasoning" }],
    contributingCourses: [{ id: "course-1", code: "GEETHICS", title: "Ethics" }],
    contributors: [
      {
        kind: "CILO" as const,
        ciloId: "cilo-1",
        ciloCode: "CILO 1",
        ciloDescription: "Explain ethical reasoning",
        course: { id: "course-1", code: "GEETHICS", title: "Ethics" },
        manifestation: "LEARNING" as const,
        meanRating: 4.5,
        ratingCount: 4,
      },
    ],
    evidenceEvaluations: [{ evaluationId: "eval-1", deploymentName: "GEETHICS v1" }],
    distributions: [
      {
        scaleLabel: "1–5 (5-point)",
        maxValue: 5,
        categories: [
          { value: 1, label: null, count: 0, percentage: 0 },
          { value: 4, label: null, count: 3, percentage: 0.75 },
          { value: 5, label: null, count: 1, percentage: 0.25 },
        ],
      },
      {
        scaleLabel: "1–4 (4-point)",
        maxValue: 4,
        categories: [{ value: 4, label: "Agree", count: 1, percentage: 1 }],
      },
    ],
    spansMultipleScales: true,
    excludedRatingCount: 0,
    evidenceSummary: { ratingCount: 4, explanation: "Mean of 4 valid ratings." },
    ...overrides,
  } satisfies GeneralEducationIloEvidenceDTO;
}

function viewDTO(
  overrides: Partial<GeneralEducationOutcomesDTO> = {}
): GeneralEducationOutcomesDTO {
  return {
    emptyReason: null,
    outcomes: [iloDTO()],
    currentMappingDisclosure:
      "Outcome rows group historical ratings using the current CILO-to-ILO mappings. Publication-time mapping snapshots are not yet available.",
    manyToManyDisclosure: true,
    unlinkedRatings: { generalItems: 2, unmappedCilos: 1 },
    alignmentCoverage: [
      {
        outcomeId: "ilo-1",
        code: "ILO-1",
        learning: 2,
        practice: 1,
        opportunity: 0,
        unclassified: 1,
      },
    ],
    courseMatrix: [
      {
        courseId: "course-1",
        courseCode: "GEETHICS",
        courseTitle: "Ethics",
        cells: [
          {
            outcomeId: "ilo-1",
            aligned: true,
            meanRating: 4.5,
            ratingCount: 4,
            spansMultipleScales: true,
          },
          {
            outcomeId: "ilo-2",
            aligned: false,
            meanRating: null,
            ratingCount: 0,
            spansMultipleScales: false,
          },
        ],
      },
    ],
    ...overrides,
  };
}

function renderView(dto = viewDTO(), filters = FILTERS) {
  return render(
    <GeneralEducationOutcomesView
      data={dto}
      resetHref="/gen-ed-coordinator/analytics"
      filters={filters}
    />
  );
}

describe("GeneralEducationOutcomesView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes the exact ILO table the browser evidence fixture reads", () => {
    renderView();

    const table = screen.getByRole("table", {
      name: "Exact values by institutional learning outcome",
    });
    expect(within(table).getByText("ILO-1")).toBeInTheDocument();
    expect(within(table).getByText("4.50")).toBeInTheDocument();
  });

  it("reports the pooled mean numerically while disclosing both scales", () => {
    renderView();

    const table = screen.getByRole("table", {
      name: "Exact values by institutional learning outcome",
    });
    // A mixed-scale row still carries a pooled mean; the scales beside it say
    // the values are not directly comparable.
    expect(within(table).getByText("4.50")).toBeInTheDocument();
    expect(within(table).getByText("1–5 (5-point)")).toBeInTheDocument();
    expect(within(table).getByText("1–4 (4-point)")).toBeInTheDocument();
    expect(within(table).getByText("Mixed scales")).toBeInTheDocument();
    expect(
      screen.getByText(/combine ratings from different frozen instrument-version scales/i)
    ).toBeInTheDocument();
  });

  it("opens source evaluation review and preserves ILO scope from contributor detail", () => {
    renderView(viewDTO(), { ...FILTERS, iloId: "ilo-1" });
    expect(screen.getByRole("link", { name: "GEETHICS v1" })).toHaveAttribute(
      "href",
      "/gen-ed-coordinator/responses/course/eval-1"
    );
    expect(screen.getByRole("link", { name: "Review responses for ILO-1" })).toHaveAttribute(
      "href",
      "/gen-ed-coordinator/responses?schoolYearId=sy-1&iloId=ilo-1"
    );
  });

  it("distinguishes an aligned course without ratings from a course with no alignment", () => {
    renderView();

    const matrix = screen.getByRole("table", {
      name: "Course and institutional learning outcome alignment",
    });
    // Aligned: the cell reports the mean and its rating count.
    expect(within(matrix).getByText("4.50")).toBeInTheDocument();
    expect(within(matrix).getByText(/^4 ratings/)).toBeInTheDocument();
    // Unaligned: the cell says so rather than showing an empty mean.
    expect(within(matrix).getByText("No alignment")).toBeInTheDocument();
  });

  it("marks an archived ILO and an evidence-free ILO explicitly", () => {
    renderView(
      viewDTO({
        outcomes: [
          iloDTO(),
          iloDTO({ outcomeId: "ilo-9", code: "ILO-9", isActive: false, order: 9 }),
          iloDTO({
            outcomeId: "ilo-8",
            code: "ILO-8",
            ratingCount: 0,
            submittedResponseCount: 0,
            meanRating: null,
            distributions: [],
          }),
        ],
      })
    );

    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.getByText(/^No evidence in this scope/)).toBeInTheDocument();
  });

  it("reports unlinked valid ratings instead of dropping them silently", () => {
    renderView();

    expect(screen.getByText(/CILOs with no current ILO mapping/i)).toBeInTheDocument();
    expect(screen.getByText(/rather than silently dropped/i)).toBeInTheDocument();
  });

  it("points identified review away from analytics and carries the active scope", () => {
    renderView();

    // Aggregate analytics stays free of respondent data: the only way onward
    // is the separately authorized response review, carrying this scope.
    const link = screen.getByRole("link", { name: "Review responses" });
    const href = link.getAttribute("href") ?? "";
    expect(href.startsWith("/gen-ed-coordinator/responses")).toBe(true);
    expect(href).toContain("schoolYearId=sy-1");
    expect(href).not.toContain("undefined");
  });

  it("discloses the many-to-many rule and the current-mapping interpretation", () => {
    renderView();

    expect(screen.getByText("Current CILO-to-ILO mappings")).toBeInTheDocument();
    expect(screen.getByText("Multiple ILO mapping")).toBeInTheDocument();
    expect(screen.getByText(/not additive across ILOs/i)).toBeInTheDocument();
  });

  it("mounts one inline AI insight beneath the deterministic evidence", () => {
    renderView();

    expect(screen.getAllByText("AI insight")).toHaveLength(1);
  });

  it("reports no-mapped-outcomes as its own empty state", () => {
    renderView(viewDTO({ emptyReason: "no-mapped-outcomes", outcomes: [] }));

    expect(screen.getByText("No mapped ILO evidence")).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: /exact values by institutional/i })).toBeNull();
  });

  it("reports a scope with no submissions without an outcome table", () => {
    renderView(viewDTO({ emptyReason: "no-submissions", outcomes: [] }));

    expect(screen.getByText("No submitted responses")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all periods" })).toBeInTheDocument();
  });
});
