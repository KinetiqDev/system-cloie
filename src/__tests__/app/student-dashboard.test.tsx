import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  StudentEvaluationsContent,
  type StudentEvaluationsContentProps,
} from "@/app/(app)/student/dashboard/page";
import type { StudentEvaluationListItem } from "@/features/responses/types";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function item(overrides: Partial<StudentEvaluationListItem>): StudentEvaluationListItem {
  return {
    assignmentId: "assignment-1",
    evaluationTitle: "Graduate Exit Evaluation",
    programLabel: "BSIT",
    courseTitle: null,
    deadlineAt: new Date("2026-11-17"),
    deploymentType: "CENTRAL",
    status: "NOT_STARTED",
    href: "/student/evaluations/assignment-1",
    progress: 0,
    ...overrides,
  } as StudentEvaluationListItem;
}

function precedes(first: Element, second: Element): boolean {
  const relation: number = first.compareDocumentPosition(second);
  return (relation & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

function renderContent(overrides: Partial<StudentEvaluationsContentProps> = {}) {
  const props: StudentEvaluationsContentProps = {
    resumeItem: null,
    draftCount: 0,
    pending: [],
    pendingCount: 0,
    completedCount: 0,
    isDeferredEnrollment: false,
    ...overrides,
  };
  return render(<StudentEvaluationsContent {...props} />);
}

describe("Student dashboard content", () => {
  it("puts the startable list above the status summary when no draft exists", () => {
    renderContent({ pending: [item({})], pendingCount: 1 });

    const pendingHeading = screen.getByRole("heading", { level: 2, name: "Pending Evaluations" });
    const summary = screen.getByRole("region", { name: "Evaluation status summary" });
    expect(precedes(pendingHeading, summary)).toBe(true);
    expect(screen.getByText("Start Evaluation").closest("a")).toHaveAttribute(
      "href",
      "/student/evaluations/assignment-1"
    );
  });

  it("leads with the resume card and trails the backlog once a draft exists", () => {
    renderContent({
      resumeItem: item({ status: "IN_PROGRESS", progress: 100 }),
      draftCount: 1,
      pending: [item({ assignmentId: "assignment-2" })],
      pendingCount: 1,
    });

    const resumeHeading = screen.getByRole("heading", { level: 2, name: "Continue" });
    const summary = screen.getByRole("region", { name: "Evaluation status summary" });
    const backlogHeading = screen.getByRole("heading", { level: 2, name: "Waiting to Start" });
    expect(precedes(resumeHeading, summary)).toBe(true);
    expect(precedes(summary, backlogHeading)).toBe(true);

    // A fully answered draft is still unsubmitted, so the copy must not claim completion.
    expect(screen.getByText("100% answered · not submitted")).toBeInTheDocument();
    expect(screen.getByText("Resume").closest("a")).toHaveAttribute(
      "href",
      "/student/evaluations/assignment-1"
    );
  });

  it("counts a draft only as in progress, never as pending", () => {
    renderContent({
      resumeItem: item({ status: "IN_PROGRESS", progress: 30 }),
      draftCount: 1,
      pending: [item({ assignmentId: "a" }), item({ assignmentId: "b" })],
      pendingCount: 2,
      completedCount: 6,
    });

    expect(screen.getByRole("link", { name: "Pending: 2" })).toHaveAttribute(
      "href",
      "/student/evaluations?tab=pending"
    );
    expect(screen.getByRole("link", { name: "In Progress: 1" })).toHaveAttribute(
      "href",
      "/student/evaluations?tab=in-progress"
    );
    expect(screen.getByRole("link", { name: "Completed: 6" })).toHaveAttribute(
      "href",
      "/student/evaluations?tab=submitted"
    );
  });

  it("never tells a respondent with a draft that they have no active evaluations", () => {
    renderContent({
      resumeItem: item({ status: "IN_PROGRESS", progress: 10 }),
      draftCount: 1,
    });

    expect(screen.getByText("Nothing waiting to be started")).toBeInTheDocument();
    expect(screen.queryByText(/no active evaluations/i)).not.toBeInTheDocument();
    expect(screen.getByText(/resume the draft above/i)).toBeInTheDocument();
  });

  it("sends View All to the pending tab", () => {
    renderContent({ pending: [item({})], pendingCount: 1 });

    expect(screen.getByRole("link", { name: "View All" })).toHaveAttribute(
      "href",
      "/student/evaluations?tab=pending"
    );
  });

  it("offers no route out to evaluations while enrollment is deferred", () => {
    renderContent({ isDeferredEnrollment: true });

    expect(screen.getByText("Evaluations unavailable")).toBeInTheDocument();
    // /student/evaluations redirects back here under deferred enrollment, so the
    // status tiles stay plain counts instead of links into that loop.
    expect(
      screen.getByRole("region", { name: "Evaluation status summary" }).querySelectorAll("a")
    ).toHaveLength(0);
    expect(screen.queryByRole("link", { name: "View All" })).not.toBeInTheDocument();
  });
});
