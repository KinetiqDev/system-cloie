import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

import { ProgramHeadOutcomesPage } from "@/features/outcomes/components/program-head-outcomes-page";
import { deletePLOAction, reorderPLOsAction, restorePLOAction } from "@/lib/actions/program-head-outcome-actions";
import type { ProgramPLOItem } from "@/features/outcomes/services/manage-program-head-outcomes";
import { showToast } from "@/components/ui/toast";

const routerRefreshMock = vi.hoisted(() => vi.fn());

const dndState = vi.hoisted(() => ({
  onDragEnd: null as null | ((event: { active: { id: string }; over: { id: string } | null }) => void),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    DndContext: ({
      children,
      onDragEnd,
    }: {
      children: React.ReactNode;
      onDragEnd: (event: { active: { id: string }; over: { id: string } | null }) => void;
    }) => {
      dndState.onDragEnd = onDragEnd;
      return <div>{children}</div>;
    },
  };
});

vi.mock("@/lib/actions/program-head-outcome-actions", () => ({
  createPLOAction: vi.fn(),
  updatePLOAction: vi.fn(),
  deletePLOAction: vi.fn(),
  reorderPLOsAction: vi.fn(),
  restorePLOAction: vi.fn(),
}));

vi.mock("@/components/ui/toast", () => ({ showToast: vi.fn() }));

const deletePLOActionMock = vi.mocked(deletePLOAction);
const reorderPLOsActionMock = vi.mocked(reorderPLOsAction);
const restorePLOActionMock = vi.mocked(restorePLOAction);
const showToastMock = vi.mocked(showToast);

function makePLO(overrides: Partial<ProgramPLOItem> = {}): ProgramPLOItem {
  return {
    id: "go-1",
    code: "GO-1",
    description: "Program Learning Outcome one",
    order: 0,
    is_active: true,
    program_id: "program-1",
    created_at: new Date("2026-01-01"),
    updated_at: new Date("2026-01-01"),
    _count: { cilo_mappings: 0 },
    ...overrides,
  };
}

const program = { id: "program-1", code: "BSCS", name: "BS Computer Science" };

describe("ProgramHeadOutcomesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deletePLOActionMock.mockResolvedValue({ success: true });
  });

  it("shows the empty state and opens the create dialog from it", () => {
    render(<ProgramHeadOutcomesPage plos={[]} program={program} />);

    expect(screen.getByText("No Program Learning Outcomes yet")).toBeInTheDocument();
    expect(screen.getByText("Add your first PLO to start tracking program outcomes.")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Add PLO" })[0]);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Add Program Learning Outcome" })).toBeInTheDocument();
  });

  it("renders mapping statistics and badges with semantic roles", () => {
    render(
      <ProgramHeadOutcomesPage
        plos={[
          makePLO(),
          makePLO({
            id: "go-2",
            code: "GO-2",
            description: "Program Learning Outcome two",
            order: 1,
            _count: { cilo_mappings: 3 },
          }),
        ]}
        program={program}
      />
    );

    expect(screen.getByText("Total PLOs")).toBeInTheDocument();
    expect(screen.getByText("Mapped to CILOs")).toBeInTheDocument();
    expect(screen.getByText("Unmapped")).toBeInTheDocument();
    expect(screen.getByText("3 CILOs mapped")).toBeInTheDocument();
    expect(screen.getByText("No mappings")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CILO Mappings" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-1/outcomes/mapping"
    );
    expect(screen.getByText("Drag rows to reorder")).toBeInTheDocument();
  });


  it("archives a PLO only through the confirmation dialog", async () => {
    render(<ProgramHeadOutcomesPage plos={[makePLO()]} program={program} />);

    fireEvent.click(screen.getByRole("button", { name: "Archive GO-1" }));

    expect(
      screen.getByRole("heading", { name: "Archive Program Learning Outcome" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));

    await waitFor(() => expect(deletePLOActionMock).toHaveBeenCalledWith("program-1", "go-1"));
    expect(showToastMock).toHaveBeenCalledWith("Program Learning Outcome archived.", "success");
  });

  it("keeps the dialog open and shows the error when archiving fails", async () => {
    deletePLOActionMock.mockResolvedValue({
      success: false,
      error: "You do not have permission to delete this Program Learning Outcome.",
    });
    render(<ProgramHeadOutcomesPage plos={[makePLO()]} program={program} />);

    fireEvent.click(screen.getByRole("button", { name: "Archive GO-1" }));
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You do not have permission to delete this Program Learning Outcome."
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      "You do not have permission to delete this Program Learning Outcome.",
      "error"
    );
  });

  it("offers Restore instead of Archive for archived PLOs", () => {
    render(
      <ProgramHeadOutcomesPage
        plos={[makePLO({ is_active: false })]}
        program={program}
      />
    );

    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore GO-1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive GO-1" })).not.toBeInTheDocument();
  });

  it("restores an archived PLO only through the confirmation dialog", async () => {
    restorePLOActionMock.mockResolvedValue({ success: true });
    render(
      <ProgramHeadOutcomesPage plos={[makePLO({ is_active: false })]} program={program} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Restore GO-1" }));

    expect(
      screen.getByRole("heading", { name: "Restore Program Learning Outcome" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restore" }));

    await waitFor(() => expect(restorePLOActionMock).toHaveBeenCalledWith("program-1", "go-1"));
    expect(showToastMock).toHaveBeenCalledWith("Program Learning Outcome restored.", "success");
  });

  it("keeps the dialog open and shows the error when restoring fails", async () => {
    restorePLOActionMock.mockResolvedValue({
      success: false,
      error: "You do not have permission to restore this Program Learning Outcome.",
    });
    render(
      <ProgramHeadOutcomesPage plos={[makePLO({ is_active: false })]} program={program} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Restore GO-1" }));
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You do not have permission to restore this Program Learning Outcome."
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      "You do not have permission to restore this Program Learning Outcome.",
      "error"
    );
  });

  it("persists a drag reorder after the save debounce", async () => {
    reorderPLOsActionMock.mockResolvedValue({ success: true });
    render(
      <ProgramHeadOutcomesPage
        plos={[
          makePLO({ id: "go-1", code: "GO-1" }),
          makePLO({ id: "go-2", code: "GO-2", order: 1 }),
        ]}
        program={program}
      />
    );

    act(() => dndState.onDragEnd?.({ active: { id: "go-1" }, over: { id: "go-2" } }));

    await waitFor(
      () => expect(reorderPLOsActionMock).toHaveBeenCalledWith("program-1", ["go-2", "go-1"]),
      { timeout: 2000 }
    );
  });

  it("shows a reorder failure alert and refreshes", async () => {
    reorderPLOsActionMock.mockResolvedValue({
      success: false,
      error: "You do not have permission to reorder Program Learning Outcomes.",
    });
    render(
      <ProgramHeadOutcomesPage
        plos={[
          makePLO({ id: "go-1", code: "GO-1" }),
          makePLO({ id: "go-2", code: "GO-2", order: 1 }),
        ]}
        program={program}
      />
    );

    act(() => dndState.onDragEnd?.({ active: { id: "go-1" }, over: { id: "go-2" } }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You do not have permission to reorder Program Learning Outcomes."
    );
    expect(routerRefreshMock).toHaveBeenCalled();
  });
});
