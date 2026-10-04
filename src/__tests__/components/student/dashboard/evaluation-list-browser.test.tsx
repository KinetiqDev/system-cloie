import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StudentEvaluationListItem } from "@/features/responses/types";

// Next patches history.pushState/replaceState so `useSearchParams` reflects a
// client-side URL change; reading the live URL reproduces that.
vi.mock("next/navigation", () => ({
  usePathname: () => "/student/evaluations",
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

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
  inProgress: [{ ...BASE_ITEM, assignmentId: "b1", evaluationTitle: "Midterm Feedback" }],
  submitted: [{ ...BASE_ITEM, assignmentId: "c1", evaluationTitle: "Final Exam Survey" }],
};

/** A deep link lands the respondent directly on one queue. */
function visitUrl(url: string) {
  window.history.replaceState(null, "", url);
}

function renderBrowser() {
  return render(<EvaluationListBrowser {...ITEMS} />);
}

function activeTab() {
  return screen.getByRole("tab", { selected: true });
}

describe("EvaluationListBrowser", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("shows the pending queue when the URL carries no tab", () => {
    renderBrowser();
    expect(activeTab()).toHaveTextContent("Pending");
    expect(screen.getByText("Course Evaluation A")).toBeInTheDocument();
    expect(screen.queryByText("Midterm Feedback")).not.toBeInTheDocument();
  });

  it("opens the in-progress queue from ?tab=in-progress", () => {
    visitUrl("/student/evaluations?tab=in-progress");
    renderBrowser();
    expect(activeTab()).toHaveTextContent("In Progress");
    expect(screen.getByText("Midterm Feedback")).toBeInTheDocument();
    expect(screen.queryByText("Course Evaluation A")).not.toBeInTheDocument();
  });

  it("opens the submitted queue from ?tab=submitted", () => {
    visitUrl("/student/evaluations?tab=submitted");
    renderBrowser();
    expect(activeTab()).toHaveTextContent("Submitted");
    expect(screen.getByText("Final Exam Survey")).toBeInTheDocument();
    expect(screen.queryByText("Course Evaluation A")).not.toBeInTheDocument();
  });

  it("falls back to pending for an unknown tab value", () => {
    visitUrl("/student/evaluations?tab=archived");
    renderBrowser();
    expect(activeTab()).toHaveTextContent("Pending");
    expect(screen.getByText("Course Evaluation A")).toBeInTheDocument();
  });

  it("keeps unrelated parameters when a tab is chosen", () => {
    visitUrl("/student/evaluations?returnTo=%2Fdashboard&tab=pending");
    const { rerender } = renderBrowser();

    fireEvent.click(screen.getByRole("tab", { name: "Submitted" }));
    rerender(<EvaluationListBrowser {...ITEMS} />);

    const params = new URLSearchParams(window.location.search);
    expect(params.get("tab")).toBe("submitted");
    expect(params.get("returnTo")).toBe("/dashboard");
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
});
