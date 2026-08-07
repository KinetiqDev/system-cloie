import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

import { ProgramHeadOutcomesPage } from "@/features/outcomes/components/program-head-outcomes-page";
import { deleteGOAction, reorderGOsAction } from "@/lib/actions/program-head-outcome-actions";
import type { ProgramGOItem } from "@/features/outcomes/services/manage-program-head-outcomes";

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
  createGOAction: vi.fn(),
  updateGOAction: vi.fn(),
  deleteGOAction: vi.fn(),
  reorderGOsAction: vi.fn(),
  prepareMappingAction: vi.fn(),
  prepareRemoveMappingAction: vi.fn(),
  commitMappingAction: vi.fn(),
}));

const deleteGOActionMock = vi.mocked(deleteGOAction);
const reorderGOsActionMock = vi.mocked(reorderGOsAction);

function makeGO(overrides: Partial<ProgramGOItem> = {}): ProgramGOItem {
  return {
    id: "go-1",
    code: "GO-1",
    description: "Graduate Outcome one",
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
    deleteGOActionMock.mockResolvedValue({ success: true });
  });

  it("shows the empty state and opens the create dialog from it", () => {
    render(<ProgramHeadOutcomesPage gos={[]} program={program} />);

    expect(screen.getByText("No Graduate Outcomes yet")).toBeInTheDocument();
    expect(screen.getByText("Add your first GO to start tracking program outcomes.")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Add GO" })[0]);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Add Graduate Outcome" })).toBeInTheDocument();
  });

  it("renders mapping statistics and badges with semantic roles", () => {
    render(
      <ProgramHeadOutcomesPage
        gos={[
          makeGO(),
          makeGO({
            id: "go-2",
            code: "GO-2",
            description: "Graduate Outcome two",
            order: 1,
            _count: { cilo_mappings: 3 },
          }),
        ]}
        program={program}
      />
    );

    expect(screen.getByText("Total GOs")).toBeInTheDocument();
    expect(screen.getByText("Mapped to CILOs")).toBeInTheDocument();
    expect(screen.getByText("3 CILOs mapped")).toBeInTheDocument();
    expect(screen.getByText("No mappings")).toBeInTheDocument();
  });

  it("archives a GO only through the confirmation dialog", async () => {
    render(<ProgramHeadOutcomesPage gos={[makeGO()]} program={program} />);

    fireEvent.click(screen.getByRole("button", { name: "Archive GO-1" }));

    expect(
      screen.getByRole("heading", { name: "Archive Graduate Outcome" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));

    await waitFor(() => expect(deleteGOActionMock).toHaveBeenCalledWith("program-1", "go-1"));
  });

  it("keeps the dialog open and shows the error when archiving fails", async () => {
    deleteGOActionMock.mockResolvedValue({
      success: false,
      error: "You do not have permission to delete this Graduate Outcome.",
    });
    render(<ProgramHeadOutcomesPage gos={[makeGO()]} program={program} />);

    fireEvent.click(screen.getByRole("button", { name: "Archive GO-1" }));
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You do not have permission to delete this Graduate Outcome."
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("persists a drag reorder after the save debounce", async () => {
    reorderGOsActionMock.mockResolvedValue({ success: true });
    render(
      <ProgramHeadOutcomesPage
        gos={[
          makeGO({ id: "go-1", code: "GO-1" }),
          makeGO({ id: "go-2", code: "GO-2", order: 1 }),
        ]}
        program={program}
      />
    );

    act(() => dndState.onDragEnd?.({ active: { id: "go-1" }, over: { id: "go-2" } }));

    await waitFor(
      () => expect(reorderGOsActionMock).toHaveBeenCalledWith("program-1", ["go-2", "go-1"]),
      { timeout: 2000 }
    );
  });

  it("shows a reorder failure alert and refreshes", async () => {
    reorderGOsActionMock.mockResolvedValue({
      success: false,
      error: "You do not have permission to reorder Graduate Outcomes.",
    });
    render(
      <ProgramHeadOutcomesPage
        gos={[
          makeGO({ id: "go-1", code: "GO-1" }),
          makeGO({ id: "go-2", code: "GO-2", order: 1 }),
        ]}
        program={program}
      />
    );

    act(() => dndState.onDragEnd?.({ active: { id: "go-1" }, over: { id: "go-2" } }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You do not have permission to reorder Graduate Outcomes."
    );
    expect(routerRefreshMock).toHaveBeenCalled();
  });
});
