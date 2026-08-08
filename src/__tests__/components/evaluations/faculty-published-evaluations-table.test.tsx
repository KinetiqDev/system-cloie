import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";import { describe, expect, it, vi } from "vitest";
import { FacultyPublishedEvaluationsTable } from "@/features/evaluations/components/faculty-published-evaluations-table";
import type { FacultyPublishedEvaluationItem } from "@/features/evaluations/types";

vi.mock("@/components/ui/toast", () => ({ showToast: vi.fn() }));

const { getFacultyEvaluationDetailActionMock, closeFacultyEvaluationActionMock } = vi.hoisted(
  () => ({
    getFacultyEvaluationDetailActionMock: vi.fn(),
    closeFacultyEvaluationActionMock: vi.fn(),
  })
);

vi.mock("@/lib/actions/faculty-evaluation-actions", () => ({
  getFacultyEvaluationDetailAction: getFacultyEvaluationDetailActionMock,
  closeFacultyEvaluationAction: closeFacultyEvaluationActionMock,
}));

vi.mock("@/lib/actions/course-bound-evaluation-actions", () => ({
  lateIncludeCourseBoundEvaluationAction: vi.fn(),
}));

function makeItem(
  overrides: Partial<FacultyPublishedEvaluationItem> = {}
): FacultyPublishedEvaluationItem {
  return {
    termInstanceLabel: "AY 2026-2027 1st Semester",
    activationAt: null,
    courseCode: "CS101",
    courseId: "course-1",
    courseTitle: "Introduction to Computing",
    courseScope: "PROGRAM_SPECIFIC",
    deadlineAt: null,
    deploymentName: "Intro to CS 2026-2027",
    evaluationId: "evaluation-1",
    majorId: null,
    majorName: null,
    programCode: "BSIT",
    programId: "program-1",
    programName: "Information Technology",
    publishedAt: new Date("2026-08-01"),
    responseCount: 2,
    status: "ACTIVE",
    targetYearLevels: [],
    totalAssignments: 5,
    ...overrides,
  };
}

describe("FacultyPublishedEvaluationsTable", () => {
  it("shows a semantic status badge per lifecycle state", () => {
    render(
      <FacultyPublishedEvaluationsTable
        evaluations={[
          makeItem({ evaluationId: "e1", status: "ACTIVE" }),
          makeItem({ evaluationId: "e2", status: "SCHEDULED" }),
          makeItem({ evaluationId: "e3", status: "CLOSED" }),
        ]}
      />
    );

    const table = within(screen.getByRole("table"));
    expect(table.getByText("Active")).toHaveClass("bg-success-soft");
    expect(table.getByText("Scheduled")).toHaveClass("bg-warning-soft");
    expect(table.getByText("Closed")).toHaveClass("bg-secondary");
  });

  it("renders an empty state when nothing is published", () => {
    render(<FacultyPublishedEvaluationsTable evaluations={[]} />);
    expect(screen.getByText(/no published evaluations yet/i)).toBeInTheDocument();
  });

  it("filters rows by status", () => {
    render(
      <FacultyPublishedEvaluationsTable
        evaluations={[
          makeItem({ evaluationId: "e1", deploymentName: "Active Eval", status: "ACTIVE" }),
          makeItem({ evaluationId: "e2", deploymentName: "Closed Eval", status: "CLOSED" }),
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /closed/i }));
    expect(screen.getByText("Closed Eval")).toBeInTheDocument();
    expect(screen.queryByText("Active Eval")).not.toBeInTheDocument();
  });

  it("confirms closing an evaluation and updates the row status", async () => {
    closeFacultyEvaluationActionMock.mockResolvedValue({ success: true });

    render(
      <FacultyPublishedEvaluationsTable
        evaluations={[makeItem({ evaluationId: "e1", deploymentName: "Active Eval" })]}
      />
    );

    const row = screen.getByText("Active Eval").closest("tr");
    expect(row).not.toBeNull();
    fireEvent.click(within(row as HTMLTableRowElement).getByRole("button", { name: /actions/i }));
    fireEvent.click(await screen.findByRole("menuitem", { name: /close evaluation/i }));

    const dialog = await screen.findByRole("alertdialog", { name: /close evaluation/i });
    expect(dialog).toHaveTextContent(/are you sure you want to close Active Eval/i);

    fireEvent.click(within(dialog).getByRole("button", { name: /close evaluation/i }));

    await waitFor(() =>
      expect(closeFacultyEvaluationActionMock).toHaveBeenCalledWith("e1")
    );
    await waitFor(() =>
      expect(
        within(screen.getByRole("table")).getByText("Closed")
      ).toHaveClass("bg-secondary")
    );
  });
});
