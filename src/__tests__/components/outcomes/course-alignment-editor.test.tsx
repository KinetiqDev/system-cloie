import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CourseAlignmentEditor } from "@/features/outcomes/components/course-alignment-editor";
import type {
  CourseAlignmentReview,
  CourseAlignment,
} from "@/features/outcomes/services/manage-course-alignment";

const COURSE_ID = "11111111-1111-4111-8111-111111111111";
const CILO_ID = "22222222-2222-4222-8222-222222222222";
const CILO_2_ID = "33333333-3333-4333-8333-333333333333";
const ILO_ID = "66666666-6666-4666-8666-666666666666";
const GO_ID = "44444444-4444-4444-8444-444444444444";
const GO_2_ID = "55555555-5555-4555-8555-555555555555";

const alignment: CourseAlignment = {
  course: {
    id: COURSE_ID,
    code: "GESTECH",
    title: "Science, Technology and Society",
    scope: "GENERAL_EDUCATION",
    program: null,
  },
  cilos: [{ id: CILO_ID, description: "Apply core concepts", targetIds: [] }],
  targets: [{ id: ILO_ID, code: "ILO-1", description: "Think critically" }],
  unavailableTargets: [],
  readiness: "incomplete-mapping",
  freshnessToken: "freshness",
};

const pspAlignment: CourseAlignment = {
  course: {
    id: COURSE_ID,
    code: "CS-101",
    title: "Computing",
    scope: "PROGRAM_SPECIFIC",
    program: { id: "program-1", code: "BSCS", name: "Computer Science" },
  },
  cilos: [
    {
      id: CILO_ID,
      description: "Apply core concepts",
      mappings: [{ ploId: GO_ID, manifestation: "LEARNING" }],
    },
  ],
  targets: [{ id: GO_ID, code: "GO-1", description: "Think critically" }],
  unavailableTargets: [],
  readiness: "ready",
  freshnessToken: "freshness",
};

const review: CourseAlignmentReview = {
  scope: "GENERAL_EDUCATION",
  courseId: COURSE_ID,
  before: [{ ciloId: CILO_ID, targetIds: [] }],
  after: [{ ciloId: CILO_ID, targetIds: [ILO_ID] }],
  additions: [{ ciloId: CILO_ID, targetId: ILO_ID }],
  removals: [],
  freshnessToken: "fresh",
  signature: "a".repeat(64),
};

const pspReview: CourseAlignmentReview = {
  scope: "PROGRAM_SPECIFIC",
  courseId: COURSE_ID,
  before: [{ ciloId: CILO_ID, mappings: [{ ploId: GO_ID, manifestation: "LEARNING" }] }],
  after: [{ ciloId: CILO_ID, mappings: [{ ploId: GO_ID, manifestation: "PRACTICE" }] }],
  additions: [],
  updates: [{ ciloId: CILO_ID, ploId: GO_ID, from: "LEARNING", to: "PRACTICE" }],
  removals: [],
  freshnessToken: "fresh",
  signature: "a".repeat(64),
};

type EditorActions = Pick<
  Parameters<typeof CourseAlignmentEditor>[0],
  "prepareAction" | "commitAction"
>;

function renderEditor({ prepareAction, commitAction }: EditorActions) {
  render(
    <CourseAlignmentEditor
      alignment={alignment}
      prepareAction={prepareAction}
      commitAction={commitAction}
    />
  );
}

function stageTarget() {
  fireEvent.click(screen.getByRole("button", { name: "Choose Institutional Outcomes" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /ILO-1: Think critically/i }));
}

describe("CourseAlignmentEditor", () => {
  it("searches, stages selection, reviews an exact diff, and commits", async () => {
    const prepareAction = vi.fn().mockResolvedValue({ success: true, review });
    const commitAction = vi.fn().mockResolvedValue({ success: true, changed: 1, freshnessToken: "fresh" });
    renderEditor({ prepareAction, commitAction });

    fireEvent.click(screen.getByRole("button", { name: "Choose Institutional Outcomes" }));
    expect(screen.getByText("ILO-1")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Search Institutional Outcomes" }), {
      target: { value: "think" },
    });
    expect(screen.getByText("ILO-1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /ILO-1: Think critically/i }));
    expect(screen.getByText("1 Institutional Outcome mapped")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Review 1 change/i }));
    await waitFor(() =>
      expect(prepareAction).toHaveBeenCalledWith({
        courseId: COURSE_ID,
        desired: [{ ciloId: CILO_ID, targetIds: [ILO_ID] }],
        freshnessToken: "freshness",
      })
    );
    expect(
      await screen.findByRole("heading", { name: "Review Course alignment changes" })
    ).toBeInTheDocument();
    expect(screen.getByText("Before:")).toBeInTheDocument();
    expect(screen.getByText("After:")).toBeInTheDocument();
    expect(screen.getAllByText("ILO-1").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Confirm and save" }));
    await waitFor(() => expect(commitAction).toHaveBeenCalledWith(review, true));
    expect(await screen.findByText("1 mapping change saved.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard changes" })).toBeDisabled();
  });

  it("reviews and commits a manifestation change from the desktop matrix", async () => {
    const prepareAction = vi.fn().mockResolvedValue({ success: true, review: pspReview });
    const commitAction = vi.fn().mockResolvedValue({ success: true, changed: 1, freshnessToken: "fresh" });
    render(
      <CourseAlignmentEditor
        alignment={pspAlignment}
        prepareAction={prepareAction}
        commitAction={commitAction}
      />
    );

    const matrix = screen.getByTestId("manifestation-matrix");
    fireEvent.click(
      within(matrix).getByRole("button", { name: "CILO 1, PLO 1, manifestation: Practice" })
    );
    fireEvent.click(screen.getByRole("button", { name: /Review 1 change/i }));
    expect(
      await screen.findByRole("heading", { name: "Review Course alignment changes" })
    ).toBeInTheDocument();
    expect(screen.getByText(/GO-1: Learning \(L\) \u2192 Practice \(P\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm and save" }));
    await waitFor(() => expect(commitAction).toHaveBeenCalledWith(pspReview, true));
    expect(await screen.findByText("1 mapping change saved.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard changes" })).toBeDisabled();
  });

  it("shows archived PLO manifestations read-only and keeps them out of draft saves", async () => {
    const ARCHIVED_GO_ID = "77777777-7777-4777-8777-777777777777";
    const archivedAlignment: CourseAlignment = {
      ...pspAlignment,
      cilos: [
        {
          id: CILO_ID,
          description: "Apply core concepts",
          mappings: [
            { ploId: GO_ID, manifestation: "LEARNING" },
            { ploId: ARCHIVED_GO_ID, manifestation: "PRACTICE" },
          ],
        },
      ],
      unavailableTargets: [
        { id: ARCHIVED_GO_ID, code: "GO-9", description: "Retired outcome" },
      ],
    };
    const saveDraftAction = vi
      .fn()
      .mockResolvedValue({ success: true, changed: 1, freshnessToken: "fresh-2" });
    render(
      <CourseAlignmentEditor
        alignment={archivedAlignment}
        prepareAction={vi.fn()}
        commitAction={vi.fn()}
        saveDraftAction={saveDraftAction}
      />
    );

    // Historical manifestation renders read-only at both viewports; no picker exists for it.
    const archivedBlock = screen.getByTestId("archived-manifestation-rows");
    expect(within(archivedBlock).getByText("GO-9")).toBeInTheDocument();
    expect(within(archivedBlock).getByText("Archived")).toBeInTheDocument();
    expect(within(archivedBlock).getByText("Practice (P)")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /GO-9/i })
    ).toBeNull();

    // Draft saves submit only the active-pair state; the archived pair is never written.
    const matrix = screen.getByTestId("manifestation-matrix");
    fireEvent.click(
      within(matrix).getByRole("button", { name: "CILO 1, PLO 1, manifestation: Practice" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Save progress" }));
    await waitFor(() =>
      expect(saveDraftAction).toHaveBeenCalledWith({
        courseId: COURSE_ID,
        cells: [
          { ciloId: CILO_ID, mappings: [{ ploId: GO_ID, manifestation: "PRACTICE" }] },
        ],
        freshnessToken: "freshness",
      })
    );
  });

  it("keeps archived PLO manifestations visible when no active PLOs exist", () => {
    const ARCHIVED_GO_ID = "77777777-7777-4777-8777-777777777777";
    render(
      <CourseAlignmentEditor
        alignment={{
          ...pspAlignment,
          targets: [],
          cilos: [
            {
              id: CILO_ID,
              description: "Apply core concepts",
              mappings: [{ ploId: ARCHIVED_GO_ID, manifestation: "OPPORTUNITY" }],
            },
          ],
          unavailableTargets: [
            { id: ARCHIVED_GO_ID, code: "GO-9", description: "Retired outcome" },
          ],
        }}
        prepareAction={vi.fn()}
        commitAction={vi.fn()}
      />
    );

    expect(
      screen.getByText("No Program Learning Outcomes have been defined for this program.")
    ).toBeInTheDocument();
    // The historical read-only manifestation stays visible even though the active
    // PLO catalog is empty.
    const archivedBlock = screen.getByTestId("archived-manifestation-rows");
    expect(within(archivedBlock).getByText("GO-9")).toBeInTheDocument();
    expect(within(archivedBlock).getByText("Opportunity (O)")).toBeInTheDocument();
  });

  it("reports archived PLO manifestations read-only in the review dialog", async () => {
    const ARCHIVED_GO_ID = "77777777-7777-4777-8777-777777777777";
    const prepareAction = vi.fn().mockResolvedValue({ success: true, review: pspReview });
    render(
      <CourseAlignmentEditor
        alignment={{
          ...pspAlignment,
          cilos: [
            {
              id: CILO_ID,
              description: "Apply core concepts",
              mappings: [
                { ploId: GO_ID, manifestation: "LEARNING" },
                { ploId: ARCHIVED_GO_ID, manifestation: "PRACTICE" },
              ],
            },
          ],
          unavailableTargets: [
            { id: ARCHIVED_GO_ID, code: "GO-9", description: "Retired outcome" },
          ],
        }}
        prepareAction={prepareAction}
        commitAction={vi.fn()}
      />
    );

    const matrix = screen.getByTestId("manifestation-matrix");
    fireEvent.click(
      within(matrix).getByRole("button", { name: "CILO 1, PLO 1, manifestation: Practice" })
    );
    fireEvent.click(screen.getByRole("button", { name: /Review 1 change/i }));
    expect(
      await screen.findByRole("heading", { name: "Review Course alignment changes" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("GO-9 (archived): Practice (P) — read-only")
    ).toBeInTheDocument();
  });

  it("reports a first-time assignment as Set to in the review dialog", async () => {
    const additionReview: CourseAlignmentReview = {
      scope: "PROGRAM_SPECIFIC",
      courseId: COURSE_ID,
      before: [{ ciloId: CILO_ID, mappings: [] }],
      after: [{ ciloId: CILO_ID, mappings: [{ ploId: GO_ID, manifestation: "OPPORTUNITY" }] }],
      additions: [{ ciloId: CILO_ID, ploId: GO_ID, manifestation: "OPPORTUNITY" }],
      updates: [],
      removals: [],
      freshnessToken: "fresh",
      signature: "a".repeat(64),
    };
    const prepareAction = vi.fn().mockResolvedValue({ success: true, review: additionReview });
    render(
      <CourseAlignmentEditor
        alignment={{ ...pspAlignment, cilos: [{ ...pspAlignment.cilos[0], mappings: [{ ploId: GO_ID, manifestation: null }] }] }}
        prepareAction={prepareAction}
        commitAction={vi.fn()}
      />
    );

    const matrix = screen.getByTestId("manifestation-matrix");
    fireEvent.click(
      within(matrix).getByRole("button", { name: "CILO 1, PLO 1, manifestation: Opportunity" })
    );
    fireEvent.click(screen.getByRole("button", { name: /Review 1 change/i }));
    expect(
      await screen.findByRole("heading", { name: "Review Course alignment changes" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/GO-1: Set to Opportunity \(O\)/)
    ).toBeInTheDocument();
  });

  it("keeps the exact-diff review open while saving", async () => {
    const prepareAction = vi.fn().mockResolvedValue({ success: true, review });
    type CommitResult = { success: true; changed: number; freshnessToken: string };
    let resolveCommit: (result: CommitResult) => void;
    const commitAction = vi.fn(
      () =>
        new Promise<CommitResult>((resolve) => {
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
    resolveCommit!({ success: true, changed: 1, freshnessToken: "fresh" });
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
      <CourseAlignmentEditor
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

  it("stages removal of an unavailable saved mapping in the General Education editor", () => {
    render(
      <CourseAlignmentEditor
        alignment={{
          ...alignment,
          cilos: [{ ...alignment.cilos[0], targetIds: [ILO_ID] }],
          targets: [],
          unavailableTargets: alignment.targets,
          freshnessToken: "freshness",
        }}
        prepareAction={vi.fn()}
        commitAction={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove unavailable ILO-1 mapping" }));
    expect(screen.getByText("0 Institutional Outcomes mapped")).toBeInTheDocument();
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

    expect(
      await screen.findByText("Course alignment changed after review. Reload and review the latest mappings.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload alignment" })).toBeEnabled();
  });

  it("shows only Institutional Outcomes and a shared-impact warning for General Education", () => {
    render(
      <CourseAlignmentEditor
        alignment={{
          ...alignment,
          targets: [{ id: ILO_ID, code: "ILO-1", description: "Think critically" }],
        }}
        prepareAction={vi.fn()}
        commitAction={vi.fn()}
      />
    );

    expect(
      screen.getByText(
        "Select the active Institutional Outcomes from the college-wide catalog."
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/apply to every active assignment using this shared Course/i))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose Institutional Outcomes" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Choose Program Learning Outcomes" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Choose Institutional Outcomes" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /ILO-1: Think critically/i }));
    expect(screen.getByText("1 Institutional Outcome mapped")).toBeInTheDocument();
  });

  it("renders the desktop matrix and mobile cards from the same draft", () => {
    const matrixAlignment: CourseAlignment = {
      ...pspAlignment,
      cilos: [
        { id: CILO_ID, description: "Apply core concepts", mappings: [{ ploId: GO_ID, manifestation: "LEARNING" }] },
        { id: CILO_2_ID, description: "Design systems", mappings: [] },
      ],
      targets: [
        { id: GO_ID, code: "GO-1", description: "Think critically" },
        { id: GO_2_ID, code: "GO-2", description: "Communicate clearly" },
      ],
      readiness: "incomplete-mapping",
    };
    render(
      <CourseAlignmentEditor
        alignment={matrixAlignment}
        prepareAction={vi.fn()}
        commitAction={vi.fn()}
      />
    );

    const matrix = screen.getByTestId("manifestation-matrix");
    expect(within(matrix).getByRole("columnheader", { name: /PLO 1/ })).toBeInTheDocument();
    expect(within(matrix).getByRole("columnheader", { name: /PLO 2/ })).toBeInTheDocument();
    expect(within(matrix).getByRole("rowheader", { name: /CILO 1/ })).toBeInTheDocument();
    expect(
      within(matrix).getByRole("button", { name: "CILO 1, PLO 1, manifestation: Learning" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(matrix).getByRole("button", { name: "CILO 1, PLO 2, manifestation: Opportunity" })
    ).toHaveAttribute("aria-pressed", "false");

    // The mobile cards render the same cells with full manifestation labels.
    const cards = screen.getByTestId("manifestation-cards");
    expect(within(cards).getAllByText("Learning (L)").length).toBeGreaterThan(0);
    expect(within(cards).getAllByText("Think critically").length).toBeGreaterThan(0);

    // Changing a cell in the matrix updates the same draft the cards read.
    fireEvent.click(
      within(matrix).getByRole("button", { name: "CILO 2, PLO 2, manifestation: Practice" })
    );
    expect(
      within(matrix).getByRole("button", { name: "CILO 2, PLO 2, manifestation: Practice" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(cards).getByRole("button", { name: "CILO 2, PLO 2, manifestation: Practice" })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("shows classified, remaining, and legacy-null pairs in the progress counter", () => {
    const matrixAlignment: CourseAlignment = {
      ...pspAlignment,
      cilos: [
        { id: CILO_ID, description: "Apply core concepts", mappings: [{ ploId: GO_ID, manifestation: "LEARNING" }] },
        { id: CILO_2_ID, description: "Design systems", mappings: [{ ploId: GO_ID, manifestation: null }] },
      ],
      targets: [
        { id: GO_ID, code: "GO-1", description: "Think critically" },
        { id: GO_2_ID, code: "GO-2", description: "Communicate clearly" },
      ],
      readiness: "incomplete-mapping",
    };
    render(
      <CourseAlignmentEditor
        alignment={matrixAlignment}
        prepareAction={vi.fn()}
        commitAction={vi.fn()}
      />
    );

    // 4 pairs: CILO1/GO-1 classified, CILO2/GO-1 legacy-null unanswered, GO-2 pairs unanswered.
    expect(screen.getByText(/1 of 4 relationships classified/)).toBeInTheDocument();
    expect(screen.getByText(/3 remaining/)).toBeInTheDocument();
    expect(
      screen.getByText("Choose Learning, Practice, or Opportunity for all PLOs before reviewing this alignment.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Review 0 changes/i })).toBeDisabled();
  });

  it("updates the progress counter when a cell is classified and cleared", () => {
    const matrixAlignment: CourseAlignment = {
      ...pspAlignment,
      cilos: [
        { id: CILO_ID, description: "Apply core concepts", mappings: [{ ploId: GO_ID, manifestation: "LEARNING" }] },
        { id: CILO_2_ID, description: "Design systems", mappings: [] },
      ],
      targets: [
        { id: GO_ID, code: "GO-1", description: "Think critically" },
        { id: GO_2_ID, code: "GO-2", description: "Communicate clearly" },
      ],
      readiness: "incomplete-mapping",
    };
    render(
      <CourseAlignmentEditor
        alignment={matrixAlignment}
        prepareAction={vi.fn()}
        commitAction={vi.fn()}
      />
    );

    const matrix = screen.getByTestId("manifestation-matrix");
    expect(screen.getByText(/1 of 4 relationships classified/)).toBeInTheDocument();

    fireEvent.click(
      within(matrix).getByRole("button", { name: "CILO 2, PLO 2, manifestation: Practice" })
    );
    expect(screen.getByText(/2 of 4 relationships classified/)).toBeInTheDocument();
    expect(screen.getByText(/2 remaining/)).toBeInTheDocument();

    fireEvent.click(
      within(matrix).getByRole("button", { name: "Clear CILO 2, PLO 2 manifestation" })
    );
    expect(screen.getByText(/1 of 4 relationships classified/)).toBeInTheDocument();
    expect(screen.getByText(/3 remaining/)).toBeInTheDocument();
  });

  it("saves progress at any time and persists the classified cells", async () => {
    const saveDraftAction = vi
      .fn()
      .mockResolvedValue({ success: true, changed: 2, freshnessToken: "fresh-2" });
    const matrixAlignment: CourseAlignment = {
      ...pspAlignment,
      cilos: [
        { id: CILO_ID, description: "Apply core concepts", mappings: [{ ploId: GO_ID, manifestation: "LEARNING" }] },
        { id: CILO_2_ID, description: "Design systems", mappings: [] },
      ],
      targets: [
        { id: GO_ID, code: "GO-1", description: "Think critically" },
        { id: GO_2_ID, code: "GO-2", description: "Communicate clearly" },
      ],
      readiness: "incomplete-mapping",
    };
    render(
      <CourseAlignmentEditor
        alignment={matrixAlignment}
        prepareAction={vi.fn()}
        commitAction={vi.fn()}
        saveDraftAction={saveDraftAction}
      />
    );

    const matrix = screen.getByTestId("manifestation-matrix");
    fireEvent.click(
      within(matrix).getByRole("button", { name: "CILO 2, PLO 1, manifestation: Practice" })
    );
    fireEvent.click(
      within(matrix).getByRole("button", { name: "CILO 2, PLO 2, manifestation: Opportunity" })
    );

    fireEvent.click(screen.getByRole("button", { name: "Save progress" }));
    await waitFor(() =>
      expect(saveDraftAction).toHaveBeenCalledWith({
        courseId: COURSE_ID,
        cells: [
          { ciloId: CILO_ID, mappings: [{ ploId: GO_ID, manifestation: "LEARNING" }] },
          {
            ciloId: CILO_2_ID,
            mappings: [
              { ploId: GO_ID, manifestation: "PRACTICE" },
              { ploId: GO_2_ID, manifestation: "OPPORTUNITY" },
            ],
          },
        ],
        freshnessToken: "freshness",
      })
    );
    expect(await screen.findByText("2 mapping changes saved.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard changes" })).toBeDisabled();
  });

  it("keeps the draft and offers reload when a stale draft save is rejected", async () => {
    const saveDraftAction = vi.fn().mockResolvedValue({
      success: false,
      error: "Course alignment changed. Reload and review the latest mappings.",
    });
    render(
      <CourseAlignmentEditor
        alignment={pspAlignment}
        prepareAction={vi.fn()}
        commitAction={vi.fn()}
        saveDraftAction={saveDraftAction}
      />
    );

    const matrix = screen.getByTestId("manifestation-matrix");
    fireEvent.click(
      within(matrix).getByRole("button", { name: "CILO 1, PLO 1, manifestation: Practice" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Save progress" }));

    expect(
      await screen.findByText(
        "Course alignment changed. Reload and review the latest mappings."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload alignment" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Discard changes" })).toBeEnabled();
  });

  it("blocks review until every required pair is classified and unlocks when complete", async () => {
    const prepareAction = vi.fn().mockResolvedValue({ success: true, review: pspReview });
    const matrixAlignment: CourseAlignment = {
      ...pspAlignment,
      cilos: [
        { id: CILO_ID, description: "Apply core concepts", mappings: [{ ploId: GO_ID, manifestation: "LEARNING" }] },
        { id: CILO_2_ID, description: "Design systems", mappings: [] },
      ],
      targets: [
        { id: GO_ID, code: "GO-1", description: "Think critically" },
        { id: GO_2_ID, code: "GO-2", description: "Communicate clearly" },
      ],
      readiness: "incomplete-mapping",
    };
    render(
      <CourseAlignmentEditor
        alignment={matrixAlignment}
        prepareAction={prepareAction}
        commitAction={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /Review 0 changes/i })).toBeDisabled();
    const matrix = screen.getByTestId("manifestation-matrix");
    fireEvent.click(
      within(matrix).getByRole("button", { name: "CILO 1, PLO 2, manifestation: Opportunity" })
    );
    fireEvent.click(
      within(matrix).getByRole("button", { name: "CILO 2, PLO 1, manifestation: Practice" })
    );
    fireEvent.click(
      within(matrix).getByRole("button", { name: "CILO 2, PLO 2, manifestation: Learning" })
    );

    expect(screen.getByRole("button", { name: /Review 3 changes/i })).toBeEnabled();
    expect(
      screen.queryByText("Choose Learning, Practice, or Opportunity for all PLOs before reviewing this alignment.")
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Review 3 changes/i }));
    expect(
      await screen.findByRole("heading", { name: "Review Course alignment changes" })
    ).toBeInTheDocument();
    expect(prepareAction).toHaveBeenCalledWith({
      courseId: COURSE_ID,
      desired: [
        {
          ciloId: CILO_ID,
          mappings: [
            { ploId: GO_ID, manifestation: "LEARNING" },
            { ploId: GO_2_ID, manifestation: "OPPORTUNITY" },
          ],
        },
        {
          ciloId: CILO_2_ID,
          mappings: [
            { ploId: GO_ID, manifestation: "PRACTICE" },
            { ploId: GO_2_ID, manifestation: "LEARNING" },
          ],
        },
      ],
      freshnessToken: "freshness",
    });
  });

  it("shows an explicit empty state when the Program has no active PLOs", () => {
    render(
      <CourseAlignmentEditor
        alignment={{ ...pspAlignment, targets: [], readiness: "incomplete-mapping" }}
        prepareAction={vi.fn()}
        commitAction={vi.fn()}
      />
    );

    expect(
      screen.getByText("No Program Learning Outcomes have been defined for this program.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("A Program Head must create PLOs before Course alignment can be completed.")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("manifestation-matrix")).toBeNull();
    expect(screen.queryByTestId("manifestation-cards")).toBeNull();
    expect(screen.getByRole("button", { name: /Review 0 changes/i })).toBeDisabled();
  });

  it("shows the no-CILO empty state for Program-specific Courses", () => {
    render(
      <CourseAlignmentEditor
        alignment={{ ...pspAlignment, cilos: [], readiness: "missing-cilos" }}
        prepareAction={vi.fn()}
        commitAction={vi.fn()}
      />
    );

    expect(screen.getByText("No active CILOs")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manage CILOs" })).toBeEnabled();
  });

  it("keeps the General Education editor unchanged", () => {
    render(
      <CourseAlignmentEditor alignment={alignment} prepareAction={vi.fn()} commitAction={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: "Choose Institutional Outcomes" })).toBeEnabled();
    expect(screen.queryByTestId("manifestation-matrix")).toBeNull();
    expect(screen.queryByTestId("manifestation-cards")).toBeNull();
    expect(screen.queryByRole("button", { name: "Save progress" })).toBeNull();
  });
});