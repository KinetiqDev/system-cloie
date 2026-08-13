import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FacultyCourseAlignmentEditor } from "@/features/outcomes/components/faculty-course-alignment-editor";
import type { CourseAlignmentReview, FacultyCourseAlignment } from "@/features/outcomes/services/manage-faculty-course-alignment";

const COURSE_ID = "11111111-1111-4111-8111-111111111111";
const CILO_ID = "22222222-2222-4222-8222-222222222222";
const GO_ID = "33333333-3333-4333-8333-333333333333";

const alignment: FacultyCourseAlignment = {
  course: { id: COURSE_ID, code: "CS-101", title: "Computing", program: { id: "program-1", code: "BSCS", name: "Computer Science" } },
  cilos: [{ id: CILO_ID, description: "Apply core concepts", targetIds: [] }],
  targets: [{ id: GO_ID, code: "GO-1", description: "Think critically" }],
  readiness: "incomplete-mapping",
};

const review: CourseAlignmentReview = {
  courseId: COURSE_ID,
  before: [{ ciloId: CILO_ID, targetIds: [] }],
  after: [{ ciloId: CILO_ID, targetIds: [GO_ID] }],
  additions: [{ ciloId: CILO_ID, targetId: GO_ID }],
  removals: [],
  freshnessToken: "fresh",
  signature: "a".repeat(64),
};

describe("FacultyCourseAlignmentEditor", () => {
  it("searches, stages selection, reviews an exact diff, and commits", async () => {
    const prepareAction = vi.fn().mockResolvedValue({ success: true, review });
    const commitAction = vi.fn().mockResolvedValue({ success: true, changed: 1 });
    render(<FacultyCourseAlignmentEditor alignment={alignment} prepareAction={prepareAction} commitAction={commitAction} />);

    fireEvent.click(screen.getByRole("button", { name: "Choose Graduate Outcomes" }));
    expect(screen.getByText("GO-1")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Search Graduate Outcomes" }), { target: { value: "think" } });
    expect(screen.getByText("GO-1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /GO-1: Think critically/i }));
    expect(screen.getByText("1 Graduate Outcome selected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Review 1 change/i }));
    await waitFor(() => expect(prepareAction).toHaveBeenCalledWith({ courseId: COURSE_ID, desired: [{ ciloId: CILO_ID, targetIds: [GO_ID] }] }));
    expect(await screen.findByRole("heading", { name: "Review Course alignment changes" })).toBeInTheDocument();
    expect(screen.getByText("Add")).toBeInTheDocument();
    expect(screen.getAllByText("GO-1").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Confirm and save" }));
    await waitFor(() => expect(commitAction).toHaveBeenCalledWith(review, true));
    expect(await screen.findByText("1 mapping change saved.")).toBeInTheDocument();
  });

  it("supports a recoverable discard state", () => {
    const prepareAction = vi.fn();
    const commitAction = vi.fn();
    render(<FacultyCourseAlignmentEditor alignment={alignment} prepareAction={prepareAction} commitAction={commitAction} />);
    expect(screen.getByRole("button", { name: "Discard changes" })).toBeDisabled();
  });
});
