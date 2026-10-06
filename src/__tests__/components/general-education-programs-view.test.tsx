import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GeneralEducationProgramsView } from "@/features/analytics/components/general-education-programs-view";
import type { GeneralEducationProgramsDTO } from "@/features/analytics/general-education-analytics-types";
import type { GeneralEducationAnalyticsFilterState } from "@/features/analytics/services/general-education-analytics-state";

vi.mock("@/features/analytics/components/general-education-inline-ai-insight", () => ({
  GeneralEducationInlineAiInsight: ({
    view,
    evidenceBasis,
  }: {
    view: string;
    evidenceBasis: string;
  }) => <div>{`AI insight [${view}]: ${evidenceBasis}`}</div>,
}));

// Chart internals are not what these assertions are about; the stubs expose the
// exact series each view hands to the client boundary so scale separation and
// singular/plural evidence basis stay observable.
vi.mock("@/features/analytics/components/general-education-analytics-visualizations", () => ({
  LazyGeneralEducationResponseRateChart: ({
    rows,
  }: {
    rows: Array<{ label: string; responseRate: number | null }>;
  }) => (
    <div>
      response-rate rows:
      {rows.map((row) => `${row.label}=${row.responseRate ?? "—"}`).join("; ")}
    </div>
  ),
  LazyGeneralEducationScaleMeanChart: ({
    series,
  }: {
    series: Array<{
      key: string;
      scaleLabel: string;
      rows: Array<{ label: string; meanRating: number | null }>;
    }>;
  }) => (
    <ul aria-label="Scale-mean series">
      {series.map((entry) => (
        <li key={entry.key}>
          {entry.scaleLabel}:{" "}
          {entry.rows.map((row) => `${row.label}=${row.meanRating ?? "—"}`).join(", ")}
        </li>
      ))}
    </ul>
  ),
}));

const FILTERS = {
  tab: "programs",
  schoolYearId: "11111111-1111-4111-8111-111111111111",
  programId: "22222222-2222-4222-8222-222222222222",
} as GeneralEducationAnalyticsFilterState;

const RESET_HREF = "/gen-ed-coordinator/analytics?tab=programs";

const ATTRIBUTION_NOTE =
  "A program here is the class context a respondent was enrolled in, aggregated across every Program.";

function programRow(
  overrides: Partial<GeneralEducationProgramsDTO["rows"][number]> = {}
): GeneralEducationProgramsDTO["rows"][number] {
  return {
    programId: "program-bsed",
    programCode: "BSED",
    programName: "Secondary Education",
    courseCount: 3,
    sectionCount: 4,
    evaluationOpportunityCount: 20,
    submittedResponseCount: 10,
    responseRate: 0.5,
    meanRating: 4.25,
    ratingCount: 30,
    spansMultipleScales: false,
    scaleGroups: [
      {
        scaleKey: "scale-5",
        scaleLabel: "1–5 (5-point)",
        meanRating: 4.25,
        ratingCount: 30,
        submittedResponseCount: 10,
        distribution: {
          scaleLabel: "1–5 (5-point)",
          maxValue: 5,
          categories: [{ value: 5, label: null, count: 30, percentage: 1 }],
        },
      },
    ],
    ...overrides,
  };
}

function programsDTO(
  overrides: Partial<GeneralEducationProgramsDTO> = {}
): GeneralEducationProgramsDTO {
  return {
    emptyReason: null,
    attributionNote: ATTRIBUTION_NOTE,
    rows: [programRow()],
    courseMatrix: [
      {
        courseId: "course-ethics",
        courseCode: "GEETHICS",
        cells: [
          {
            programId: "program-bsed",
            meanRating: 4.25,
            ratingCount: 30,
            submittedResponseCount: 10,
            spansMultipleScales: false,
          },
          {
            programId: "program-bsba",
            meanRating: null,
            ratingCount: 0,
            submittedResponseCount: 0,
            spansMultipleScales: false,
          },
        ],
      },
    ],
    ...overrides,
  };
}

function renderView(dto = programsDTO(), filters = FILTERS) {
  return render(
    <GeneralEducationProgramsView data={dto} resetHref={RESET_HREF} filters={filters} />
  );
}

describe("GeneralEducationProgramsView", () => {
  afterEach(cleanup);

  it("states class-context attribution in its own words, not a generic note", () => {
    renderView();

    expect(screen.getByText("Class-context attribution")).toBeInTheDocument();
    expect(screen.getByText(ATTRIBUTION_NOTE)).toBeInTheDocument();
  });

  it("reports a cell that was not evaluated rather than a zero mean", () => {
    renderView(
      programsDTO({
        rows: [
          programRow(),
          programRow({
            programId: "program-bsba",
            programCode: "BSBA",
            programName: "Business Administration",
          }),
        ],
      })
    );

    const matrix = screen.getByRole("table", { name: "Course and program evidence matrix" });
    // The BSBA column holds no responses and no ratings for GEETHICS.
    expect(within(matrix).getByText("Not evaluated")).toBeInTheDocument();
    expect(within(matrix).getByText("BSBA")).toBeInTheDocument();
    // The evaluated column reports its mean and its counts.
    expect(within(matrix).getByText("4.25")).toBeInTheDocument();
    expect(within(matrix).getByText("10 resp · 30 ratings")).toBeInTheDocument();
  });

  it("marks a matrix cell that pools more than one scale and a single rating", () => {
    renderView(
      programsDTO({
        courseMatrix: [
          {
            courseId: "course-ethics",
            courseCode: "GEETHICS",
            cells: [
              {
                programId: "program-bsed",
                meanRating: 3.5,
                ratingCount: 1,
                submittedResponseCount: 1,
                spansMultipleScales: true,
              },
            ],
          },
        ],
      })
    );

    const matrix = screen.getByRole("table", { name: "Course and program evidence matrix" });
    expect(within(matrix).getByText("1 resp · 1 rating · mixed")).toBeInTheDocument();
  });

  it("reports a missing course attribution instead of an empty matrix", () => {
    renderView(programsDTO({ courseMatrix: [] }));

    expect(screen.getByText("No course attribution")).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Course and program evidence matrix" })).toBeNull();
  });

  it("keeps each program's means inside one scale and points review at that program", () => {
    renderView(
      programsDTO({
        rows: [
          programRow(),
          programRow({
            programId: "program-bsba",
            programCode: "BSBA",
            programName: "Business Administration",
            responseRate: null,
            evaluationOpportunityCount: 0,
            submittedResponseCount: 0,
            ratingCount: 0,
            meanRating: null,
            spansMultipleScales: true,
            scaleGroups: [
              {
                scaleKey: "scale-4",
                scaleLabel: "1–4 (4-point)",
                meanRating: 3.5,
                ratingCount: 12,
                submittedResponseCount: 6,
                distribution: {
                  scaleLabel: "1–4 (4-point)",
                  maxValue: 4,
                  categories: [{ value: 4, label: "Agree", count: 12, percentage: 1 }],
                },
              },
            ],
          }),
        ],
      })
    );

    // Two scale identities produce two series; the 1–4 mean is never plotted
    // beside the 1–5 mean.
    const series = within(screen.getByRole("list", { name: "Scale-mean series" }));
    expect(series.getByText("1–5 (5-point): BSED — Secondary Education=4.25")).toBeInTheDocument();
    expect(
      series.getByText("1–4 (4-point): BSBA — Business Administration=3.5")
    ).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Exact values by program of respondents" });
    // A program with no evaluation opportunity has no response rate, not 0.0%.
    expect(within(table).getAllByText("—")).toHaveLength(2); // mean and response rate
    expect(within(table).getByText("0/0")).toBeInTheDocument();
    expect(within(table).getByText("Mixed scales")).toBeInTheDocument();
    const reviewLinks = within(table).getAllByRole("link", { name: "Review responses" });
    expect(reviewLinks[0]).toHaveAttribute(
      "href",
      "/gen-ed-coordinator/responses?schoolYearId=11111111-1111-4111-8111-111111111111&programId=program-bsed"
    );
    expect(reviewLinks[1]).toHaveAttribute(
      "href",
      "/gen-ed-coordinator/responses?schoolYearId=11111111-1111-4111-8111-111111111111&programId=program-bsba"
    );
  });

  it("discloses a thin-sample program without withholding its evidence", () => {
    renderView(programsDTO({ rows: [programRow({ submittedResponseCount: 3, ratingCount: 9 })] }));

    expect(screen.getByText("Thin sample: 3 submitted responses")).toBeInTheDocument();
    expect(
      screen.getByText(/Means for BSED rest on fewer than five submitted responses/)
    ).toBeInTheDocument();
    // Evidence stays visible next to its limitation.
    const table = screen.getByRole("table", { name: "Exact values by program of respondents" });
    expect(within(table).getByText("4.25")).toBeInTheDocument();
  });

  it("mounts exactly one insight carrying the counted evidence basis", () => {
    renderView(
      programsDTO({
        rows: [
          programRow(),
          programRow({
            programId: "program-bsba",
            programCode: "BSBA",
            programName: "Business Administration",
            submittedResponseCount: 1,
            ratingCount: 2,
          }),
        ],
      })
    );

    const insights = screen.getAllByText(/^AI insight /);
    expect(insights).toHaveLength(1);
    expect(insights[0]).toHaveTextContent(
      "AI insight [programs]: 11 submitted responses and 32 valid ratings across 2 programs"
    );
  });

  it("reports submitted responses no program can be attributed to without charts", () => {
    renderView(programsDTO({ emptyReason: null, rows: [], courseMatrix: [] }));

    expect(screen.getByText("No program attribution in this scope")).toBeInTheDocument();
    expect(
      screen.getByText(/none belong to a respondent enrolled in a Program/)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("table", { name: "Exact values by program of respondents" })
    ).toBeNull();
    expect(screen.queryByRole("table", { name: "Course and program evidence matrix" })).toBeNull();
    expect(
      screen.getByText("AI insight [programs]: No program attribution in this scope")
    ).toBeInTheDocument();
  });

  it("reports a scope with no submissions once, with a single reset action", () => {
    renderView(programsDTO({ emptyReason: "no-submissions", rows: [], courseMatrix: [] }));

    expect(screen.getByText("No submitted responses")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "View all periods" })).toHaveLength(1);
    expect(screen.queryByText("No program attribution in this scope")).toBeNull();
  });

  it("reports a scope with no evaluation assignments", () => {
    renderView(programsDTO({ emptyReason: "no-assignments", rows: [], courseMatrix: [] }));

    expect(screen.getByText("No evaluation assignments")).toBeInTheDocument();
    expect(screen.queryByText("No program attribution in this scope")).toBeNull();
  });
});
