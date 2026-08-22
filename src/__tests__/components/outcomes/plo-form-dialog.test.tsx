import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

import { PLOFormDialog } from "@/features/outcomes/components/plo-form-dialog";
import { createPLOAction, updatePLOAction } from "@/lib/actions/program-head-outcome-actions";
import type { ProgramPLOItem } from "@/features/outcomes/services/manage-program-head-outcomes";
import { showToast } from "@/components/ui/toast";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/components/ui/toast", () => ({ showToast: vi.fn() }));

vi.mock("@/lib/actions/program-head-outcome-actions", () => ({
  createPLOAction: vi.fn(),
  updatePLOAction: vi.fn(),
  deletePLOAction: vi.fn(),
  reorderPLOsAction: vi.fn(),
}));

const createPLOActionMock = vi.mocked(createPLOAction);
const updatePLOActionMock = vi.mocked(updatePLOAction);
const showToastMock = vi.mocked(showToast);

function makePLO(overrides: Partial<ProgramPLOItem> = {}): ProgramPLOItem {
  return {
    id: "11111111-1111-4111-8111-111111111112",
    code: "GO-1",
    description: "Program Learning Outcome one",
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

describe("PLOFormDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createPLOActionMock.mockResolvedValue({ success: true });
    updatePLOActionMock.mockResolvedValue({ success: true });
  });

  it("shows field validation errors on invalid submit", async () => {
    render(
      <PLOFormDialog
        mode="create"
        programId="11111111-1111-4111-8111-111111111111"
        open
        onOpenChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Create PLO" }));

    expect(await screen.findByText("PLO code is required.")).toBeInTheDocument();
    expect(screen.getByText("Description must be at least 3 characters.")).toBeInTheDocument();
    expect(createPLOActionMock).not.toHaveBeenCalled();
  });

  it("submits a valid create form and closes the dialog", async () => {
    const onOpenChange = vi.fn();
    render(
      <PLOFormDialog
        mode="create"
        programId="11111111-1111-4111-8111-111111111111"
        open
        onOpenChange={onOpenChange}
      />
    );

    fireEvent.change(screen.getByLabelText("PLO Code"), { target: { value: "GO-5" } });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Program Learning Outcome five" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create PLO" }));

    await waitFor(() =>
      expect(createPLOActionMock).toHaveBeenCalledWith(expect.any(FormData))
    );
    expect(readFormData(createPLOActionMock.mock.calls[0][0])).toEqual({
      programId: "11111111-1111-4111-8111-111111111111",
      code: "GO-5",
      description: "Program Learning Outcome five",
      id: null,
    });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(showToastMock).toHaveBeenCalledWith(
      "Program Learning Outcome created successfully.",
      "success"
    );
  });

  it("surfaces a server error and keeps the dialog open", async () => {
    createPLOActionMock.mockResolvedValue({
      success: false,
      error: "Program Learning Outcome code already exists.",
    });
    const onOpenChange = vi.fn();
    render(
      <PLOFormDialog
        mode="create"
        programId="11111111-1111-4111-8111-111111111111"
        open
        onOpenChange={onOpenChange}
      />
    );

    fireEvent.change(screen.getByLabelText("PLO Code"), { target: { value: "GO-5" } });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Program Learning Outcome five" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create PLO" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Program Learning Outcome code already exists.");
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith(
      "Program Learning Outcome code already exists.",
      "error"
    );
  });

  it("prefills the edit form and submits an update", async () => {
    const onOpenChange = vi.fn();
    render(
      <PLOFormDialog
        mode="edit"
        programId="11111111-1111-4111-8111-111111111111"
        plo={makePLO()}
        open
        onOpenChange={onOpenChange}
      />
    );

    expect(screen.getByLabelText("PLO Code")).toHaveValue("GO-1");
    expect(screen.getByLabelText("Description")).toHaveValue("Program Learning Outcome one");

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Revised outcome" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(updatePLOActionMock).toHaveBeenCalledWith(expect.any(FormData))
    );
    expect(readFormData(updatePLOActionMock.mock.calls[0][0])).toEqual({
      programId: "11111111-1111-4111-8111-111111111111",
      code: "GO-1",
      description: "Revised outcome",
      id: "11111111-1111-4111-8111-111111111112",
    });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(showToastMock).toHaveBeenCalledWith(
      "Program Learning Outcome updated successfully.",
      "success"
    );
  });

  it("announces the pending action state on the submit button", async () => {
    let resolveAction!: (value: { success: true } | { success: false; error: string }) => void;
    createPLOActionMock.mockReturnValue(
      new Promise((resolve) => {
        resolveAction = resolve;
      })
    );
    render(
      <PLOFormDialog
        mode="create"
        programId="11111111-1111-4111-8111-111111111111"
        open
        onOpenChange={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("PLO Code"), { target: { value: "GO-9" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Nine" } });
    fireEvent.click(screen.getByRole("button", { name: "Create PLO" }));

    const pending = await screen.findByRole("button", { name: "Saving..." });
    expect(pending).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      resolveAction({ success: true });
    });
  });
});
