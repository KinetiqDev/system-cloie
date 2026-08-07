import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

import { GOFormDialog } from "@/features/outcomes/components/go-form-dialog";
import { createGOAction, updateGOAction } from "@/lib/actions/program-head-outcome-actions";
import type { ProgramGOItem } from "@/features/outcomes/services/manage-program-head-outcomes";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/actions/program-head-outcome-actions", () => ({
  createGOAction: vi.fn(),
  updateGOAction: vi.fn(),
  deleteGOAction: vi.fn(),
  reorderGOsAction: vi.fn(),
  prepareMappingAction: vi.fn(),
  prepareRemoveMappingAction: vi.fn(),
  commitMappingAction: vi.fn(),
}));

const createGOActionMock = vi.mocked(createGOAction);
const updateGOActionMock = vi.mocked(updateGOAction);

function makeGO(overrides: Partial<ProgramGOItem> = {}): ProgramGOItem {
  return {
    id: "11111111-1111-4111-8111-111111111112",
    code: "GO-1",
    description: "Graduate Outcome one",
    order: 0,
    is_active: true,
    program_id: "11111111-1111-4111-8111-111111111111",
    created_at: new Date("2026-01-01"),
    updated_at: new Date("2026-01-01"),
    _count: { cilo_mappings: 0 },
    ...overrides,
  };
}

function readFormData(formData: FormData) {
  return {
    programId: formData.get("programId"),
    code: formData.get("code"),
    description: formData.get("description"),
    id: formData.get("id"),
  };
}

describe("GOFormDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createGOActionMock.mockResolvedValue({ success: true });
    updateGOActionMock.mockResolvedValue({ success: true });
  });

  it("shows field validation errors on invalid submit", async () => {
    render(
      <GOFormDialog
        mode="create"
        programId="11111111-1111-4111-8111-111111111111"
        open
        onOpenChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Create GO" }));

    expect(await screen.findByText("GO code is required.")).toBeInTheDocument();
    expect(screen.getByText("Description must be at least 3 characters.")).toBeInTheDocument();
    expect(createGOActionMock).not.toHaveBeenCalled();
  });

  it("submits a valid create form and closes the dialog", async () => {
    const onOpenChange = vi.fn();
    render(
      <GOFormDialog
        mode="create"
        programId="11111111-1111-4111-8111-111111111111"
        open
        onOpenChange={onOpenChange}
      />
    );

    fireEvent.change(screen.getByLabelText("GO Code"), { target: { value: "GO-5" } });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Graduate Outcome five" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create GO" }));

    await waitFor(() =>
      expect(createGOActionMock).toHaveBeenCalledWith(expect.any(FormData))
    );
    expect(readFormData(createGOActionMock.mock.calls[0][0])).toEqual({
      programId: "11111111-1111-4111-8111-111111111111",
      code: "GO-5",
      description: "Graduate Outcome five",
      id: null,
    });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("surfaces a server error and keeps the dialog open", async () => {
    createGOActionMock.mockResolvedValue({
      success: false,
      error: "Graduate Outcome code already exists.",
    });
    const onOpenChange = vi.fn();
    render(
      <GOFormDialog
        mode="create"
        programId="11111111-1111-4111-8111-111111111111"
        open
        onOpenChange={onOpenChange}
      />
    );

    fireEvent.change(screen.getByLabelText("GO Code"), { target: { value: "GO-5" } });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Graduate Outcome five" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create GO" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Graduate Outcome code already exists.");
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("prefills the edit form and submits an update", async () => {
    const onOpenChange = vi.fn();
    render(
      <GOFormDialog
        mode="edit"
        programId="11111111-1111-4111-8111-111111111111"
        go={makeGO()}
        open
        onOpenChange={onOpenChange}
      />
    );

    expect(screen.getByLabelText("GO Code")).toHaveValue("GO-1");
    expect(screen.getByLabelText("Description")).toHaveValue("Graduate Outcome one");

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Revised outcome" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(updateGOActionMock).toHaveBeenCalledWith(expect.any(FormData))
    );
    expect(readFormData(updateGOActionMock.mock.calls[0][0])).toEqual({
      programId: "11111111-1111-4111-8111-111111111111",
      code: "GO-1",
      description: "Revised outcome",
      id: "11111111-1111-4111-8111-111111111112",
    });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("announces the pending action state on the submit button", async () => {
    let resolveAction!: (value: { success: true } | { success: false; error: string }) => void;
    createGOActionMock.mockReturnValue(
      new Promise((resolve) => {
        resolveAction = resolve;
      })
    );
    render(
      <GOFormDialog
        mode="create"
        programId="11111111-1111-4111-8111-111111111111"
        open
        onOpenChange={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("GO Code"), { target: { value: "GO-9" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Nine" } });
    fireEvent.click(screen.getByRole("button", { name: "Create GO" }));

    const pending = await screen.findByRole("button", { name: "Saving..." });
    expect(pending).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      resolveAction({ success: true });
    });
  });
});
