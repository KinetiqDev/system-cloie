import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FacultyPublishedEvaluations } from "@/features/evaluations/components/faculty-published-evaluations";
import type { FacultyPublishedEvaluationItem } from "@/features/evaluations/types";

vi.mock("@/components/ui/toast", () => ({ showToast: vi.fn() }));

const { closeFacultyEvaluationActionMock } = vi.hoisted(() => ({
  closeFacultyEvaluationActionMock: vi.fn(),
}));

vi.mock("@/lib/actions/faculty-evaluation-actions", () => ({
  closeFacultyEvaluationAction: closeFacultyEvaluationActionMock,
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

describe("FacultyPublishedEvaluations", () => {
  it("shows a semantic status badge per lifecycle state", () => {
    render(
      <FacultyPublishedEvaluations
        view="list"
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

  it.each(["card", "list"] as const)("shows a readable academic period in %s view", (view) => {
    render(
      <FacultyPublishedEvaluations
        view={view}
        evaluations={[makeItem({ termInstanceLabel: "2026-2027 — 2nd Semester — 2nd Term" })]}
      />
    );

    expect(screen.getByText("2026-2027 — 2nd Semester — 2nd Term")).toBeVisible();
    expect(screen.queryByText(/SECOND/)).not.toBeInTheDocument();
  });

  it("renders an empty state when nothing is published", () => {
    render(<FacultyPublishedEvaluations view="list" evaluations={[]} />);
    expect(screen.getByText(/no published evaluations yet/i)).toBeInTheDocument();
  });

  it("filters rows by status", () => {
    render(
      <FacultyPublishedEvaluations
        view="list"
        evaluations={[
          makeItem({ evaluationId: "e1", deploymentName: "Active Eval", status: "ACTIVE" }),
          makeItem({ evaluationId: "e2", deploymentName: "Closed Eval", status: "CLOSED" }),
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Closed" }));
    expect(screen.getByText("Closed Eval")).toBeInTheDocument();
    expect(screen.queryByText("Active Eval")).not.toBeInTheDocument();
  });

  it("renders View Details as semantic links to the detail route", async () => {
    render(
      <FacultyPublishedEvaluations
        view="list"
        evaluations={[makeItem({ evaluationId: "eval-123", deploymentName: "Detail Link Eval" })]}
      />
    );

    // Card actions (when in card view) and menu items both expose links; list view menu is accessible via actions button.
    const row = screen.getByText("Detail Link Eval").closest("tr");
    expect(row).not.toBeNull();
    fireEvent.click(within(row as HTMLTableRowElement).getByRole("button", { name: /actions/i }));
    const menuItem = await screen.findByRole("menuitem", { name: /view details/i });
    expect(menuItem.closest("a")).toHaveAttribute("href", "/faculty/tools/published/eval-123");
  });

  it("renders View Details link in card view with href supporting new tabs", () => {
    render(
      <FacultyPublishedEvaluations
        view="card"
        evaluations={[makeItem({ evaluationId: "eval-card-1", deploymentName: "Card Link Eval" })]}
      />
    );

    const link = screen.getByRole("link", { name: /view details/i });
    expect(link).toHaveAttribute("href", "/faculty/tools/published/eval-card-1");
    expect(link.tagName.toLowerCase()).toBe("a");
  });

  it("does not retain client fetch for detail dialog", () => {
    // Ensures the legacy dialog flow is gone: no dialog with EvaluationDetailDialog copy exists.
    render(<FacultyPublishedEvaluations view="list" evaluations={[makeItem()]} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("confirms closing an evaluation and updates the row status", async () => {
    closeFacultyEvaluationActionMock.mockResolvedValue({ success: true });

    render(
      <FacultyPublishedEvaluations
        view="list"
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

    await waitFor(() => expect(closeFacultyEvaluationActionMock).toHaveBeenCalledWith("e1"));
    await waitFor(() =>
      expect(within(screen.getByRole("table")).getByText("Closed")).toHaveClass("bg-secondary")
    );
  });
});
