import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

import { ProgramHeadOutcomesPage } from "@/features/outcomes/components/program-head-outcomes-page";
import {
  deletePOAction,
  reorderPOsAction,
  restorePOAction,
} from "@/lib/actions/program-head-outcome-actions";
import type { ProgramPOItem } from "@/features/outcomes/services/manage-program-head-outcomes";
import { showToast } from "@/components/ui/toast";

const routerRefreshMock = vi.hoisted(() => vi.fn());

const dndState = vi.hoisted(() => ({
  onDragEnd: null as
    | null
    | ((event: { active: { id: string }; over: { id: string } | null }) => void),
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
  createPOAction: vi.fn(),
  updatePOAction: vi.fn(),
  deletePOAction: vi.fn(),
  reorderPOsAction: vi.fn(),
  restorePOAction: vi.fn(),
}));

vi.mock("@/components/ui/toast", () => ({ showToast: vi.fn() }));

const deletePOActionMock = vi.mocked(deletePOAction);
const reorderPOsActionMock = vi.mocked(reorderPOsAction);
const restorePOActionMock = vi.mocked(restorePOAction);
const showToastMock = vi.mocked(showToast);

function makePO(overrides: Partial<ProgramPOItem> = {}): ProgramPOItem {
  return {
    id: "po-1",
    code: "PO-1",
    description: "Program Outcome one",
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
    deletePOActionMock.mockResolvedValue({ success: true });
  });

  it("shows the empty state and opens the create dialog from it", () => {
    render(<ProgramHeadOutcomesPage pos={[]} program={program} />);

    expect(screen.getByText("No Program Outcomes yet")).toBeInTheDocument();
    expect(
      screen.getByText("Add your first PO to start tracking program outcomes.")
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Add PO" })[0]);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Add Program Outcome" })).toBeInTheDocument();
  });

  it("renders mapping statistics and badges with semantic roles", () => {
    render(
      <ProgramHeadOutcomesPage
        pos={[
          makePO(),
          makePO({
            id: "po-2",
            code: "PO-2",
            description: "Program Outcome two",
            order: 1,
            _count: { cilo_mappings: 3 },
          }),
        ]}
        program={program}
      />
    );

    expect(screen.getByText("Total POs")).toBeInTheDocument();
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

  it("archives a PO only through the confirmation dialog", async () => {
    render(<ProgramHeadOutcomesPage pos={[makePO()]} program={program} />);

    fireEvent.click(screen.getByRole("button", { name: "Archive PO-1" }));

    expect(screen.getByRole("heading", { name: "Archive Program Outcome" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));

    await waitFor(() => expect(deletePOActionMock).toHaveBeenCalledWith("program-1", "po-1"));
    expect(showToastMock).toHaveBeenCalledWith("Program Outcome archived.", "success");
  });

  it("keeps the dialog open and shows the error when archiving fails", async () => {
    deletePOActionMock.mockResolvedValue({
      success: false,
      error: "You do not have permission to delete this Program Outcome.",
    });
    render(<ProgramHeadOutcomesPage pos={[makePO()]} program={program} />);

    fireEvent.click(screen.getByRole("button", { name: "Archive PO-1" }));
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You do not have permission to delete this Program Outcome."
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      "You do not have permission to delete this Program Outcome.",
      "error"
    );
  });

  it("offers Restore instead of Archive for archived POs", () => {
    render(<ProgramHeadOutcomesPage pos={[makePO({ is_active: false })]} program={program} />);

    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore PO-1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive PO-1" })).not.toBeInTheDocument();
  });

  it("restores an archived PO only through the confirmation dialog", async () => {
    restorePOActionMock.mockResolvedValue({ success: true });
    render(<ProgramHeadOutcomesPage pos={[makePO({ is_active: false })]} program={program} />);

    fireEvent.click(screen.getByRole("button", { name: "Restore PO-1" }));

    expect(screen.getByRole("heading", { name: "Restore Program Outcome" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restore" }));

    await waitFor(() => expect(restorePOActionMock).toHaveBeenCalledWith("program-1", "po-1"));
    expect(showToastMock).toHaveBeenCalledWith("Program Outcome restored.", "success");
  });

  it("keeps the dialog open and shows the error when restoring fails", async () => {
    restorePOActionMock.mockResolvedValue({
      success: false,
      error: "You do not have permission to restore this Program Outcome.",
    });
    render(<ProgramHeadOutcomesPage pos={[makePO({ is_active: false })]} program={program} />);

    fireEvent.click(screen.getByRole("button", { name: "Restore PO-1" }));
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You do not have permission to restore this Program Outcome."
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      "You do not have permission to restore this Program Outcome.",
      "error"
    );
  });

  it("persists a drag reorder after the save debounce", async () => {
    reorderPOsActionMock.mockResolvedValue({ success: true });
    render(
      <ProgramHeadOutcomesPage
        pos={[makePO({ id: "po-1", code: "PO-1" }), makePO({ id: "po-2", code: "PO-2", order: 1 })]}
        program={program}
      />
    );

    act(() => dndState.onDragEnd?.({ active: { id: "po-1" }, over: { id: "po-2" } }));

    await waitFor(
      () => expect(reorderPOsActionMock).toHaveBeenCalledWith("program-1", ["po-2", "po-1"]),
      { timeout: 2000 }
    );
  });

  it("shows a reorder failure alert and refreshes", async () => {
    reorderPOsActionMock.mockResolvedValue({
      success: false,
      error: "You do not have permission to reorder Program Outcomes.",
    });
    render(
      <ProgramHeadOutcomesPage
        pos={[makePO({ id: "po-1", code: "PO-1" }), makePO({ id: "po-2", code: "PO-2", order: 1 })]}
        program={program}
      />
    );

    act(() => dndState.onDragEnd?.({ active: { id: "po-1" }, over: { id: "po-2" } }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You do not have permission to reorder Program Outcomes."
    );
    expect(routerRefreshMock).toHaveBeenCalled();
  });
});
