import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { StudentEvaluationListItem } from "@/features/responses/types";
import { EvaluationListBrowser } from "@/features/users/components/evaluation-list-browser";

const BASE_ITEM: StudentEvaluationListItem = {
  assignmentId: "assignment-1",
  evaluationId: "eval-1",
  evaluationTitle: "Post-Term CILO Evaluation",
  courseTitle: "ITE 18",
  programLabel: "BSIT",
  facultyName: "Prof. John Doe",
  deploymentType: "COURSE_BOUND",
  deadlineAt: new Date("2026-05-20"),
  href: "/student/evaluations/eval-1",
  status: "NOT_STARTED",
  progress: 0,
  section: { id: "section-b", name: "Section B", description: "", items: [] },
  session: { responseId: null, answeredItems: 0, totalItems: 5, submittedAt: null },
};

const ITEMS = {
  pending: [
    { ...BASE_ITEM, assignmentId: "a1", evaluationTitle: "Course Evaluation A" },
    { ...BASE_ITEM, assignmentId: "a2", evaluationTitle: "Alumni Survey" },
  ],
  inProgress: [
    { ...BASE_ITEM, assignmentId: "b1", evaluationTitle: "Midterm Feedback" },
  ],
  submitted: [
    { ...BASE_ITEM, assignmentId: "c1", evaluationTitle: "Final Exam Survey" },
  ],
};

function renderBrowser() {
  render(<EvaluationListBrowser {...ITEMS} />);
}

describe("EvaluationListBrowser", () => {
  it("renders pill tabs and the default pending list", () => {
    renderBrowser();
    expect(screen.getByRole("tablist")).toHaveAttribute("data-variant", "pill");
    expect(screen.getByRole("tab", { name: "Pending" })).toHaveAttribute("data-active");
    expect(screen.getByText("Course Evaluation A")).toBeInTheDocument();
    expect(screen.getByText("Alumni Survey")).toBeInTheDocument();
  });

  it("switches tabs to in-progress and submitted lists", () => {
    renderBrowser();
    fireEvent.click(screen.getByRole("tab", { name: "In Progress" }));
    expect(screen.getByText("Midterm Feedback")).toBeInTheDocument();
    expect(screen.queryByText("Course Evaluation A")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Submitted" }));
    expect(screen.getByText("Final Exam Survey")).toBeInTheDocument();
  });

  it("filters the active tab by search term", () => {
    renderBrowser();
    const search = screen.getByRole("searchbox", { name: "Search evaluations" });
    fireEvent.change(search, { target: { value: "alumni" } });

    expect(screen.queryByText("Course Evaluation A")).not.toBeInTheDocument();
    expect(screen.getByText("Alumni Survey")).toBeInTheDocument();
  });

  it("shows a no-match message when the search finds nothing", () => {
    renderBrowser();
    const search = screen.getByRole("searchbox", { name: "Search evaluations" });
    fireEvent.change(search, { target: { value: "zzz" } });

    expect(screen.getByText("No evaluations match your search.")).toBeInTheDocument();
  });

  it("does not render a Filter button", () => {
    renderBrowser();
    expect(screen.queryByRole("button", { name: /filter/i })).not.toBeInTheDocument();
  });
});
