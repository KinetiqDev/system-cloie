import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FacultyCourseAlignmentEditor } from "@/features/outcomes/components/faculty-course-alignment-editor";
import type {
  CourseAlignmentReview,
  FacultyCourseAlignment,
} from "@/features/outcomes/services/manage-faculty-course-alignment";

const COURSE_ID = "11111111-1111-4111-8111-111111111111";
const CILO_ID = "22222222-2222-4222-8222-222222222222";
const GO_ID = "33333333-3333-4333-8333-333333333333";

const alignment: FacultyCourseAlignment = {
  course: {
    id: COURSE_ID,
    code: "CS-101",
    title: "Computing",
    program: { id: "program-1", code: "BSCS", name: "Computer Science" },
  },
  cilos: [{ id: CILO_ID, description: "Apply core concepts", targetIds: [] }],
  targets: [{ id: GO_ID, code: "GO-1", description: "Think critically" }],
  unavailableTargets: [],
  readiness: "incomplete-mapping",
  freshnessToken: "freshness",
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

type EditorActions = Pick<
  Parameters<typeof FacultyCourseAlignmentEditor>[0],
  "prepareAction" | "commitAction"
>;

function renderEditor({ prepareAction, commitAction }: EditorActions) {
  render(
    <FacultyCourseAlignmentEditor
      alignment={alignment}
      prepareAction={prepareAction}
      commitAction={commitAction}
    />
  );
}

function stageTarget() {
  fireEvent.click(screen.getByRole("button", { name: "Choose Graduate Outcomes" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /GO-1: Think critically/i }));
}

describe("FacultyCourseAlignmentEditor", () => {
  it("searches, stages selection, reviews an exact diff, and commits", async () => {
    const prepareAction = vi.fn().mockResolvedValue({ success: true, review });
    const commitAction = vi.fn().mockResolvedValue({ success: true, changed: 1 });
    renderEditor({ prepareAction, commitAction });

    fireEvent.click(screen.getByRole("button", { name: "Choose Graduate Outcomes" }));
    expect(screen.getByText("GO-1")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Search Graduate Outcomes" }), {
      target: { value: "think" },
    });
    expect(screen.getByText("GO-1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /GO-1: Think critically/i }));
    expect(screen.getByText("1 Graduate Outcome mapped")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Review 1 change/i }));
    await waitFor(() =>
      expect(prepareAction).toHaveBeenCalledWith({
        courseId: COURSE_ID,
        desired: [{ ciloId: CILO_ID, targetIds: [GO_ID] }],
        freshnessToken: "freshness",
      })
    );
    expect(
      await screen.findByRole("heading", { name: "Review Course alignment changes" })
    ).toBeInTheDocument();
    expect(screen.getByText("Before:")).toBeInTheDocument();
    expect(screen.getByText("After:")).toBeInTheDocument();
    expect(screen.getAllByText("GO-1").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Confirm and save" }));
    await waitFor(() => expect(commitAction).toHaveBeenCalledWith(review, true));
    expect(await screen.findByText("1 mapping change saved.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard changes" })).toBeDisabled();
  });

  it("keeps the exact-diff review open while saving", async () => {
    const prepareAction = vi.fn().mockResolvedValue({ success: true, review });
    let resolveCommit: (result: { success: true; changed: number }) => void;
    const commitAction = vi.fn(
      () =>
        new Promise<{ success: true; changed: number }>((resolve) => {
          resolveCommit = resolve;
        })
    );
    renderEditor({ prepareAction, commitAction });
    stageTarget();
    fireEvent.click(screen.getByRole("button", { name: /Review 1 change/i }));
    await screen.findByRole("heading", { name: "Review Course alignment changes" });

    fireEvent.click(screen.getByRole("button", { name: "Confirm and save" }));

    expect(
      screen.getByRole("heading", { name: "Review Course alignment changes" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    resolveCommit!({ success: true, changed: 1 });
    expect(await screen.findByText("1 mapping change saved.")).toBeInTheDocument();
  });

  it("keeps restoring a canceled history traversal until it reaches the dirty entry", () => {
    const originalNavigation = Object.getOwnPropertyDescriptor(window, "navigation");
    const originalState = window.history.state;
    const originalUrl = window.location.href;
    Reflect.deleteProperty(window, "navigation");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const historyGo = vi.spyOn(window.history, "go").mockImplementation(() => undefined);
    const { unmount } = render(
      <FacultyCourseAlignmentEditor
        alignment={alignment}
        prepareAction={vi.fn()}
        commitAction={vi.fn()}
      />
    );

    try {
      stageTarget();
      const dirtyEntryState = window.history.state;
      window.history.replaceState({ page: "intermediate" }, "", "/intermediate");
      window.dispatchEvent(new PopStateEvent("popstate"));
      window.dispatchEvent(new PopStateEvent("popstate"));
      window.history.replaceState(dirtyEntryState, "", "/faculty/cilos/test/alignment");
      window.dispatchEvent(new PopStateEvent("popstate"));

      expect(historyGo).toHaveBeenCalledTimes(2);
      expect(historyGo).toHaveBeenLastCalledWith(1);
    } finally {
      unmount();
      confirm.mockRestore();
      historyGo.mockRestore();
      window.history.replaceState(originalState, "", originalUrl);
      if (originalNavigation) Object.defineProperty(window, "navigation", originalNavigation);
    }
  });

  it("requires confirmation before discarding a staged draft", () => {
    const prepareAction = vi.fn();
    const commitAction = vi.fn();
    renderEditor({ prepareAction, commitAction });
    stageTarget();
    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));

    expect(
      screen.getByRole("heading", { name: "Discard staged alignment changes?" })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Discard draft" }));
    expect(screen.getByRole("button", { name: "Discard changes" })).toBeDisabled();
  });

  it("stages removal of an unavailable saved mapping", () => {
    render(
      <FacultyCourseAlignmentEditor
        alignment={{
          ...alignment,
          cilos: [{ ...alignment.cilos[0], targetIds: [GO_ID] }],
          targets: [],
          unavailableTargets: alignment.targets,
          freshnessToken: "freshness",
        }}
        prepareAction={vi.fn()}
        commitAction={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove unavailable GO-1 mapping" }));
    expect(screen.getByText("0 Graduate Outcomes mapped")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Review 1 change/i })).toBeEnabled();
  });

  it("prompts before a dirty draft leaves through application navigation", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderEditor({ prepareAction: vi.fn(), commitAction: vi.fn() });
    stageTarget();
    const link = document.createElement("a");
    link.href = "/faculty/cilos";
    document.body.append(link);

    fireEvent.click(link);

    expect(confirm).toHaveBeenCalledWith("Discard staged alignment changes?");
    link.remove();
    confirm.mockRestore();
  });

  it("restores the dirty entry after canceling a multi-step browser-history traversal", () => {
    const originalNavigation = Object.getOwnPropertyDescriptor(window, "navigation");
    let historyIndex = 3;
    Object.defineProperty(window, "navigation", {
      configurable: true,
      get: () => ({ currentEntry: { index: historyIndex } }),
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const historyGo = vi.spyOn(window.history, "go").mockImplementation(() => undefined);
    renderEditor({ prepareAction: vi.fn(), commitAction: vi.fn() });
    stageTarget();
    historyIndex = 0;

    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(confirm).toHaveBeenCalledWith("Discard staged alignment changes?");
    expect(historyGo).toHaveBeenCalledWith(3);
    confirm.mockRestore();
    historyGo.mockRestore();
    if (originalNavigation) Object.defineProperty(window, "navigation", originalNavigation);
    else Reflect.deleteProperty(window, "navigation");
  });

  it("preserves a stale draft and offers reload after a failed review", async () => {
    const prepareAction = vi.fn().mockResolvedValueOnce({
      success: false,
      error: "Course alignment changed after review. Reload and review the latest mappings.",
    });
    const commitAction = vi.fn();
    renderEditor({ prepareAction, commitAction });
    stageTarget();
    fireEvent.click(screen.getByRole("button", { name: /Review 1 change/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Course alignment changed after review."
    );
    expect(screen.getByRole("button", { name: "Reload alignment" })).toBeEnabled();
  });
});
