import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EvaluationDetailDialog } from "@/features/evaluations/components/evaluation-detail-dialog";
import type { FacultyEvaluationDetail } from "@/features/evaluations/types";

function makeDetail(status: FacultyEvaluationDetail["status"]): FacultyEvaluationDetail {
  return {
    termInstanceLabel: "AY 2026-2027 1st Semester",
    activationAt: null,
    cilos: [],
    courseInfo: {
      courseCode: "CS101",
      courseScope: "PROGRAM",
      courseTitle: "Introduction to Computing",
      majorName: null,
      programCode: "BSIT",
      programName: "Information Technology",
    },
    deadlineAt: null,
    deploymentName: "Intro to CS 2026-2027",
    evaluationId: "evaluation-1",
    publishedAt: new Date("2026-08-01"),
    responseCount: 0,
    status,
    targets: [],
    templateBindings: [],
    totalAssignments: 0,
    exclusions: [],
    lateInclusionOpen: false,
  };
}

const STATUS_VARIANT: Record<FacultyEvaluationDetail["status"], string> = {
  ACTIVE: "bg-success-soft",
  SCHEDULED: "bg-warning-soft",
  CLOSED: "bg-secondary",
  ARCHIVED: "bg-secondary",
  DRAFT: "bg-secondary",
};

describe("EvaluationDetailDialog", () => {
  it.each(["ACTIVE", "SCHEDULED", "CLOSED", "ARCHIVED"] as const)(
    "renders the %s status with a semantic badge",
    (status) => {
      render(
        <EvaluationDetailDialog
          detail={makeDetail(status)}
          open
          onOpenChange={() => undefined}
        />
      );
      const badge = screen.getByText(status.charAt(0) + status.slice(1).toLowerCase());
      expect(badge).toHaveClass(STATUS_VARIANT[status]);
    }
  );

  it("shows course, timeline, and completion details", () => {
    const detail = makeDetail("ACTIVE");
    render(
      <EvaluationDetailDialog detail={detail} open onOpenChange={() => undefined} />
    );

    expect(screen.getByText("Intro to CS 2026-2027")).toBeInTheDocument();
    expect(screen.getByText(/CS101 - Introduction to Computing/)).toBeInTheDocument();
    expect(screen.getByText(/BSIT - Information Technology/)).toBeInTheDocument();
    expect(screen.getByText("0 / 0")).toBeInTheDocument();
  });
});
