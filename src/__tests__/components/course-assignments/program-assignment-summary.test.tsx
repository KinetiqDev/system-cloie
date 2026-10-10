import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProgramAssignmentSummary } from "@/features/course-assignments/components/program-assignment-summary";
import { readProgramAssignmentSummary } from "@/features/course-assignments/services/read-program-assignment-summary";

vi.mock("@/features/course-assignments/services/read-program-assignment-summary", () => ({
  readProgramAssignmentSummary: vi.fn(),
}));

describe("ProgramAssignmentSummary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the faculty and General Education class independently of evaluation evidence", async () => {
    vi.mocked(readProgramAssignmentSummary).mockResolvedValue({
      total: 1,
      termId: "term-1",
      assignments: [
        {
          id: "assignment-1",
          year_level: "FIRST_YEAR",
          section: "MORNING",
          course: {
            code: "GEUS",
            title: "Understanding the Self",
            course_scope: "GENERAL_EDUCATION",
          },
          faculty: { name: "Marco Villanueva" },
          program: { code: "BSIT" },
        },
      ],
    });
    render(await ProgramAssignmentSummary({ programId: "program-1", filters: {} }));
    expect(screen.getByText("GEUS · Understanding the Self")).toBeVisible();
    expect(screen.getByText("General Education")).toBeVisible();
    expect(screen.getByText("Marco Villanueva · BSIT · 1st Year · Morning")).toBeVisible();
    expect(screen.getByRole("link", { name: "View assignments (1)" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-1/course-assignments?termInstanceId=term-1"
    );
  });

  it("explains the empty period", async () => {
    vi.mocked(readProgramAssignmentSummary).mockResolvedValue({
      total: 0,
      termId: null,
      assignments: [],
    });
    render(await ProgramAssignmentSummary({ programId: "program-1", filters: {} }));
    expect(screen.getByText("No active course assignments in this period.")).toBeVisible();
  });

  it("labels broader-period drill-through explicitly instead of defaulting to the active period", async () => {
    vi.mocked(readProgramAssignmentSummary).mockResolvedValue({
      total: 2,
      termId: undefined,
      assignments: [],
    });
    render(
      await ProgramAssignmentSummary({
        programId: "program-1",
        filters: { schoolYearId: "year-1" },
      })
    );
    expect(
      screen.getByRole("link", { name: "View assignments across all periods" })
    ).toHaveAttribute(
      "href",
      "/program-head/programs/program-1/course-assignments?termInstanceId=all"
    );
  });

  it("does not render unauthorized assignment data", async () => {
    vi.mocked(readProgramAssignmentSummary).mockResolvedValue(null);
    expect(await ProgramAssignmentSummary({ programId: "unauthorized", filters: {} })).toBeNull();
  });
});
