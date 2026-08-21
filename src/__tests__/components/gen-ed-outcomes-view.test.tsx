import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GenEdOutcomesPage } from "@/features/outcomes/components/gen-ed-outcomes-page";
import { archiveILOAction, reorderILOsAction, restoreILOAction } from "@/lib/actions/gen-ed-outcome-actions";
import type { InstitutionalOutcomeItem } from "@/features/outcomes/services/manage-gen-ed-outcomes";

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

vi.mock("@/lib/actions/gen-ed-outcome-actions", () => ({
  createILOAction: vi.fn(),
  updateILOAction: vi.fn(),
  archiveILOAction: vi.fn(),
  reorderILOsAction: vi.fn(),
  restoreILOAction: vi.fn(),
}));

const archiveILOActionMock = vi.mocked(archiveILOAction);
const reorderILOsActionMock = vi.mocked(reorderILOsAction);
const restoreILOActionMock = vi.mocked(restoreILOAction);

function makeILO(overrides: Partial<InstitutionalOutcomeItem> = {}): InstitutionalOutcomeItem {
  return {
    id: "ilo-1",
    code: "ILO-1",
    description: "Institutional learning outcome one",
    order: 0,
    is_active: true,
    created_at: new Date("2026-01-01"),
    updated_at: new Date("2026-01-01"),
    _count: { cilo_institutional_outcome_mappings: 0 },
    ...overrides,
  };
}

describe("GenEdOutcomesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    archiveILOActionMock.mockResolvedValue({ success: true, data: undefined } as never);
    restoreILOActionMock.mockResolvedValue({ success: true, data: undefined } as never);
    reorderILOsActionMock.mockResolvedValue({ success: true, data: undefined } as never);
  });

  it("shows empty state and opens create dialog from it", () => {
    render(<GenEdOutcomesPage ilos={[]} />);

    expect(screen.getByText("No Institutional Learning Outcomes yet")).toBeInTheDocument();
    const addButtons = screen.getAllByRole("button", { name: "Add ILO" });
    expect(addButtons.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(addButtons[1] ?? addButtons[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders stats: Total ILOs, Mapped to CILOs, Unmapped when present", () => {
    render(
      <GenEdOutcomesPage
        ilos={[
          makeILO(),
          makeILO({
            id: "ilo-2",
            code: "ILO-2",
            description: "Two",
            order: 1,
            _count: { cilo_institutional_outcome_mappings: 2 },
          }),
        ]}
      />
    );

    expect(screen.getByText("Total ILOs")).toBeInTheDocument();
    expect(screen.getByText("Mapped to CILOs")).toBeInTheDocument();
    expect(screen.getByText("Unmapped")).toBeInTheDocument();
    expect(screen.getByText("No mappings")).toBeInTheDocument();
    expect(screen.getByText("2 CILOs mapped")).toBeInTheDocument();
  });

  it("hides Unmapped segment when all mapped", () => {
    render(
      <GenEdOutcomesPage
        ilos={[
          makeILO({ _count: { cilo_institutional_outcome_mappings: 1 } }),
          makeILO({ id: "ilo-2", code: "ILO-2", description: "Two", order: 1, _count: { cilo_institutional_outcome_mappings: 1 } }),
        ]}
      />
    );
    expect(screen.queryByText("Unmapped")).not.toBeInTheDocument();
  });

  it("archives via confirmation dialog", async () => {
    render(<GenEdOutcomesPage ilos={[makeILO()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Archive ILO-1" }));
    expect(screen.getByRole("heading", { name: "Archive Institutional Learning Outcome" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    await waitFor(() => expect(archiveILOActionMock).toHaveBeenCalledWith("ilo-1"));
  });

  it("keeps dialog open and shows delete/archived error when archiving fails", async () => {
    archiveILOActionMock.mockResolvedValue({
      success: false,
      error: "You do not have permission to archive this Institutional Outcome.",
    } as never);
    render(<GenEdOutcomesPage ilos={[makeILO()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Archive ILO-1" }));
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You do not have permission to archive this Institutional Outcome."
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("offers Restore for archived and restores through dialog", async () => {
    render(<GenEdOutcomesPage ilos={[makeILO({ is_active: false })]} />);

    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore ILO-1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive ILO-1" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restore ILO-1" }));
    expect(screen.getByRole("heading", { name: "Restore Institutional Learning Outcome" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    await waitFor(() => expect(restoreILOActionMock).toHaveBeenCalledWith("ilo-1"));
  });

  it("keeps restore dialog open and shows error when restore fails", async () => {
    restoreILOActionMock.mockResolvedValue({
      success: false,
      error: "You do not have permission to restore this Institutional Outcome.",
    } as never);
    render(<GenEdOutcomesPage ilos={[makeILO({ is_active: false })]} />);

    fireEvent.click(screen.getByRole("button", { name: "Restore ILO-1" }));
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You do not have permission to restore this Institutional Outcome."
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("persists drag reorder after debounce", async () => {
    reorderILOsActionMock.mockResolvedValue({ success: true, data: undefined } as never);
    render(
      <GenEdOutcomesPage
        ilos={[
          makeILO({ id: "ilo-1", code: "ILO-1" }),
          makeILO({ id: "ilo-2", code: "ILO-2", order: 1 }),
        ]}
      />
    );

    act(() => dndState.onDragEnd?.({ active: { id: "ilo-1" }, over: { id: "ilo-2" } }));

    await waitFor(() => expect(reorderILOsActionMock).toHaveBeenCalledWith(["ilo-2", "ilo-1"]), {
      timeout: 2000,
    });
  });

  it("shows reorder error and refreshes when reorder is denied", async () => {
    reorderILOsActionMock.mockResolvedValue({
      success: false,
      error: "You do not have permission to reorder Institutional Outcomes.",
    } as never);
    render(
      <GenEdOutcomesPage
        ilos={[
          makeILO({ id: "ilo-1", code: "ILO-1" }),
          makeILO({ id: "ilo-2", code: "ILO-2", order: 1 }),
        ]}
      />
    );

    act(() => dndState.onDragEnd?.({ active: { id: "ilo-1" }, over: { id: "ilo-2" } }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You do not have permission to reorder Institutional Outcomes."
    );
    expect(routerRefreshMock).toHaveBeenCalled();
  });
});
