import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EditUserDialog } from "@/features/users/components/secretary-users-list/edit-user-dialog";
import { SystemRole } from "@prisma/client";
import { getUserEditRecordAction, editUserBySecretaryAction } from "@/lib/actions/secretary-edit-user-actions";

vi.mock("@/lib/actions/secretary-edit-user-actions", () => ({
  getUserEditRecordAction: vi.fn(),
  editUserBySecretaryAction: vi.fn(),
}));

// Mock ResizeObserver for Base UI dialog tests
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe("EditUserDialog", () => {
  const mockOnClose = vi.fn();
  const mockOnUserUpdated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderDialog(userId: string | null = "target-user") {
    return render(
      <EditUserDialog
        userId={userId}
        currentUserId="secretary-admin"
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
      />
    );
  }

  it("does not open when userId is null", () => {
    renderDialog(null);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows loading state initially when opened", async () => {
    (getUserEditRecordAction as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderDialog();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/loading user record/i);
  });

  it("loads and displays base user data", async () => {
    (getUserEditRecordAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "target-user",
        firstName: "John",
        lastName: "Doe",
        email: "john@acd.edu.ph",
        isActive: true,
        role: SystemRole.DEAN,
        student: null,
        activeEnrollment: null,
        verification: null,
        industryPartner: null,
        alumni: null,
      },
    });

    renderDialog();

    await waitFor(() => {
      expect(screen.getByDisplayValue("John")).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue("Doe")).toBeInTheDocument();
    expect(screen.getByText("john@acd.edu.ph")).toBeInTheDocument();
    expect(screen.getByText(/Dean/)).toBeInTheDocument();
  });

  it("blocks submission and shows error if trying to edit own account", async () => {
    (getUserEditRecordAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "secretary-admin",
        firstName: "Sec",
        lastName: "Admin",
        email: "admin@acd.edu.ph",
        isActive: true,
        role: SystemRole.SECRETARY,
        student: null,
        activeEnrollment: null,
        verification: null,
        industryPartner: null,
        alumni: null,
      },
    });

    // Pass the same ID as currentUserId
    render(
      <EditUserDialog
        userId="secretary-admin"
        currentUserId="secretary-admin"
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Sec")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/cannot edit your own account/i);
    });

    expect(editUserBySecretaryAction).not.toHaveBeenCalled();
  });

  it("submits changes and closes on success", async () => {
    (getUserEditRecordAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "target-user",
        firstName: "John",
        lastName: "Doe",
        email: "john@acd.edu.ph",
        isActive: true,
        role: SystemRole.DEAN,
        student: null,
        activeEnrollment: null,
        verification: null,
        industryPartner: null,
        alumni: null,
      },
    });

    (editUserBySecretaryAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { id: "target-user" },
    });

    renderDialog();

    await waitFor(() => {
      expect(screen.getByDisplayValue("John")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Johnny" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(editUserBySecretaryAction).toHaveBeenCalledTimes(1);
    });

    const formData = (editUserBySecretaryAction as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as FormData;
    expect(formData.get("id")).toBe("target-user");
    expect(formData.get("first_name")).toBe("Johnny");
    expect(formData.get("last_name")).toBe("Doe");

    await waitFor(() => {
      expect(mockOnUserUpdated).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("displays server errors from the load action", async () => {
    (getUserEditRecordAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: "User not found.",
    });

    renderDialog();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/user not found/i);
    });

    expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument();
  });
});
