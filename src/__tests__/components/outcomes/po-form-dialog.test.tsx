import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

import { POFormDialog } from "@/features/outcomes/components/po-form-dialog";
import { createPOAction, updatePOAction } from "@/lib/actions/program-head-outcome-actions";
import type { ProgramPOItem } from "@/features/outcomes/services/manage-program-head-outcomes";
import { showToast } from "@/components/ui/toast";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/components/ui/toast", () => ({ showToast: vi.fn() }));

vi.mock("@/lib/actions/program-head-outcome-actions", () => ({
  createPOAction: vi.fn(),
  updatePOAction: vi.fn(),
  deletePOAction: vi.fn(),
  reorderPOsAction: vi.fn(),
}));

const createPOActionMock = vi.mocked(createPOAction);
const updatePOActionMock = vi.mocked(updatePOAction);
const showToastMock = vi.mocked(showToast);

function makePO(overrides: Partial<ProgramPOItem> = {}): ProgramPOItem {
  return {
    id: "11111111-1111-4111-8111-111111111112",
    code: "PO-1",
    description: "Program Outcome one",
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

describe("POFormDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createPOActionMock.mockResolvedValue({ success: true });
    updatePOActionMock.mockResolvedValue({ success: true });
  });

  it("shows field validation errors on invalid submit", async () => {
    render(
      <POFormDialog
        mode="create"
        programId="11111111-1111-4111-8111-111111111111"
        open
        onOpenChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Create PO" }));

    expect(await screen.findByText("PO code is required.")).toBeInTheDocument();
    expect(screen.getByText("Description must be at least 3 characters.")).toBeInTheDocument();
    expect(createPOActionMock).not.toHaveBeenCalled();
  });

  it("submits a valid create form and closes the dialog", async () => {
    const onOpenChange = vi.fn();
    render(
      <POFormDialog
        mode="create"
        programId="11111111-1111-4111-8111-111111111111"
        open
        onOpenChange={onOpenChange}
      />
    );

    fireEvent.change(screen.getByLabelText("PO Code"), { target: { value: "PO-5" } });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Program Outcome five" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create PO" }));

    await waitFor(() => expect(createPOActionMock).toHaveBeenCalledWith(expect.any(FormData)));
    expect(readFormData(createPOActionMock.mock.calls[0][0])).toEqual({
      programId: "11111111-1111-4111-8111-111111111111",
      code: "PO-5",
      description: "Program Outcome five",
      id: null,
    });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(showToastMock).toHaveBeenCalledWith("Program Outcome created successfully.", "success");
  });

  it("surfaces a server error and keeps the dialog open", async () => {
    createPOActionMock.mockResolvedValue({
      success: false,
      error: "Program Outcome code already exists.",
    });
    const onOpenChange = vi.fn();
    render(
      <POFormDialog
        mode="create"
        programId="11111111-1111-4111-8111-111111111111"
        open
        onOpenChange={onOpenChange}
      />
    );

    fireEvent.change(screen.getByLabelText("PO Code"), { target: { value: "PO-5" } });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Program Outcome five" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create PO" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Program Outcome code already exists."
    );
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith("Program Outcome code already exists.", "error");
  });

  it("prefills the edit form and submits an update", async () => {
    const onOpenChange = vi.fn();
    render(
      <POFormDialog
        mode="edit"
        programId="11111111-1111-4111-8111-111111111111"
        po={makePO()}
        open
        onOpenChange={onOpenChange}
      />
    );

    expect(screen.getByLabelText("PO Code")).toHaveValue("PO-1");
    expect(screen.getByLabelText("Description")).toHaveValue("Program Outcome one");

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Revised outcome" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(updatePOActionMock).toHaveBeenCalledWith(expect.any(FormData)));
    expect(readFormData(updatePOActionMock.mock.calls[0][0])).toEqual({
      programId: "11111111-1111-4111-8111-111111111111",
      code: "PO-1",
      description: "Revised outcome",
      id: "11111111-1111-4111-8111-111111111112",
    });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(showToastMock).toHaveBeenCalledWith("Program Outcome updated successfully.", "success");
  });

  it("announces the pending action state on the submit button", async () => {
    let resolveAction!: (value: { success: true } | { success: false; error: string }) => void;
    createPOActionMock.mockReturnValue(
      new Promise((resolve) => {
        resolveAction = resolve;
      })
    );
    render(
      <POFormDialog
        mode="create"
        programId="11111111-1111-4111-8111-111111111111"
        open
        onOpenChange={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("PO Code"), { target: { value: "PO-9" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Nine" } });
    fireEvent.click(screen.getByRole("button", { name: "Create PO" }));

    const pending = await screen.findByRole("button", { name: "Saving..." });
    expect(pending).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      resolveAction({ success: true });
    });
  });
});
