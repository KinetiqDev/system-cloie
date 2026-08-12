import { beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EditUserDialog } from "@/features/users/components/secretary-users-list/edit-user-dialog";
import { SystemRole, VerificationStatus } from "@prisma/client";
import {
  getUserEditRecordAction,
  editUserBySecretaryAction,
} from "@/lib/actions/secretary-edit-user-actions";

vi.mock("@/lib/actions/secretary-edit-user-actions", () => ({
  getUserEditRecordAction: vi.fn(),
  editUserBySecretaryAction: vi.fn(),
}));

// Mock the Base UI-backed Select with a lightweight, test-friendly version so
// program selection can be exercised without relying on pointer/keyboard internals.
const SelectContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}>({});

vi.mock("@/components/ui/select", () => {
  function Select({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    children: React.ReactNode;
  }) {
    return (
        <SelectContext.Provider value={{ value, onValueChange, disabled }}>
        <span data-testid="select-value" data-value={value ?? ""}>
          {children}
        </span>
      </SelectContext.Provider>
    );
  }
  function SelectTrigger({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    const { disabled } = React.useContext(SelectContext);
    return (
      <button type="button" role="combobox" aria-expanded="false" disabled={disabled} {...props}>
        {children}
      </button>
    );
  }
  function SelectValue({
    placeholder,
    children,
  }: {
    placeholder?: string;
    children?: React.ReactNode;
  }) {
    const { value } = React.useContext(SelectContext);
    return <span>{children ?? placeholder ?? value}</span>;
  }
  function SelectContent({ children }: { children: React.ReactNode }) {
    return <div role="listbox">{children}</div>;
  }
  function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
    const ctx = React.useContext(SelectContext);
    return (
      <div role="option" data-value={value} onClick={() => ctx.onValueChange?.(value)}>
        {children}
      </div>
    );
  }
  return {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
  };
});

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
        programs={[]}
        yearLevels={[]}
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

    render(
      <EditUserDialog
        userId="target-user"
        currentUserId="secretary-admin"
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
        programs={FACULTY_PROGRAMS}
        yearLevels={[]}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/loading user record/i);
  });

  it("loads and displays base user data", async () => {
    (getUserEditRecordAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "target-user",
        name: "John Doe",
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

    render(
      <EditUserDialog
        userId="target-user"
        currentUserId="secretary-admin"
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
        programs={FACULTY_PROGRAMS}
        yearLevels={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    });
    expect(screen.getByText("john@acd.edu.ph")).toBeInTheDocument();
    expect(screen.getByText(/Dean/)).toBeInTheDocument();
  });

  it("blocks submission and shows error if trying to edit own account", async () => {
    (getUserEditRecordAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "secretary-admin",
        name: "Sec Admin",
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
        programs={[]}
        yearLevels={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Sec Admin")).toBeInTheDocument();
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
        name: "John Doe",
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

    render(
      <EditUserDialog
        userId="target-user"
        currentUserId="secretary-admin"
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
        programs={FACULTY_PROGRAMS}
        yearLevels={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: "Johnny Doe" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(editUserBySecretaryAction).toHaveBeenCalledTimes(1);
    });

    const formData = (editUserBySecretaryAction as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as FormData;
    expect(formData.get("id")).toBe("target-user");
    expect(formData.get("name")).toBe("Johnny Doe");
    expect(formData.get("first_name")).toBeNull();
    expect(formData.get("last_name")).toBeNull();

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

    render(
      <EditUserDialog
        userId="target-user"
        currentUserId="secretary-admin"
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
        programs={FACULTY_PROGRAMS}
        yearLevels={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/user not found/i);
    });

    expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
  });

  // ─── Faculty-specific UI tests ─────────────────────────────────────────

  const FACULTY_PROGRAMS = [
    { id: "prog-old", code: "BSIT", name: "Information Technology", majors: [] },
    { id: "prog-new", code: "BSIS", name: "Information Systems", majors: [] },
  ];

  it("shows primary-program control for Faculty role", async () => {
    (getUserEditRecordAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "target-user",
        name: "Jane Smith",
        email: "jane@acd.edu.ph",
        isActive: true,
        role: SystemRole.FACULTY,
        student: null,
        activeEnrollment: null,
        verification: null,
        industryPartner: null,
        alumni: null,
        faculty: { primaryProgramId: "prog-old" },
        programHead: null,
      },
    });

    render(
      <EditUserDialog
        userId="target-user"
        currentUserId="secretary-admin"
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
        programs={FACULTY_PROGRAMS}
        yearLevels={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Jane Smith")).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/primary program affiliation/i)).toBeInTheDocument();
    expect(
      screen.getByText(/additional active affiliations remain unchanged/i)
    ).toBeInTheDocument();
  });

  it("shows labels instead of stored IDs and enum values in selected controls", async () => {
    (getUserEditRecordAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "target-user",
        name: "Abbegail Abebon",
        email: "student@acd.edu.ph",
        isActive: true,
        role: SystemRole.STUDENT,
        student: {
          studentIdNumber: "1000818031",
          programId: "prog-old",
          programCode: "BSIT",
          programName: "Information Technology",
          majorId: "major-old",
          majorName: "Networks",
        },
        activeEnrollment: {
          id: "enrollment-id",
          termInstanceId: "term-id",
          programId: "prog-old",
          majorId: "major-old",
          yearLevel: "FOURTH_YEAR",
          section: "EVENING",
        },
        faculty: null,
        programHead: null,
        verification: null,
        industryPartner: null,
        alumni: null,
      },
    });

    render(
      <EditUserDialog
        userId="target-user"
        currentUserId="secretary-admin"
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
        programs={[
          {
            id: "prog-old",
            code: "BSIT",
            name: "Information Technology",
            majors: [{ id: "major-old", name: "Networks" }],
          },
        ]}
        yearLevels={["FOURTH_YEAR"]}
      />
    );

    await waitFor(() => expect(screen.getByDisplayValue("Abbegail Abebon")).toBeInTheDocument());

    expect(screen.getByLabelText("Program")).toHaveTextContent("Information Technology");
    expect(screen.getByLabelText("Major")).toHaveTextContent("Networks");
    expect(screen.getByLabelText("Year Level")).toHaveTextContent("Fourth Year");
    expect(screen.getByLabelText("Section")).toHaveTextContent("Evening");
  });

  it("shows Industry Partner organization, optional fields, and verification effect", async () => {
    (getUserEditRecordAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "target-user",
        name: "Pat Partner",
        email: "partner@example.com",
        isActive: true,
        role: SystemRole.INDUSTRY_PARTNER,
        student: null,
        activeEnrollment: null,
        faculty: null,
        programHead: null,
        verification: { status: VerificationStatus.PENDING },
        industryPartner: {
          companyName: "CLOIE Labs",
          position: null,
          programId: null,
        },
        alumni: null,
      },
    });

    render(
      <EditUserDialog
        userId="target-user"
        currentUserId="secretary-admin"
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
        programs={FACULTY_PROGRAMS}
        yearLevels={[]}
      />
    );

    await waitFor(() => expect(screen.getByDisplayValue("CLOIE Labs")).toBeInTheDocument());
    expect(screen.getByLabelText(/position \(optional\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/affiliated program \(optional\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/verification status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/verification status/i)).toHaveTextContent("Pending");
    expect(screen.getByText(/limited dashboard access remains/i)).toBeInTheDocument();
  });

  it("requires explicit verification for a legacy Industry Partner", async () => {
    (getUserEditRecordAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "target-user",
        name: "Legacy Partner",
        email: "legacy@example.com",
        isActive: true,
        role: SystemRole.INDUSTRY_PARTNER,
        student: null,
        activeEnrollment: null,
        faculty: null,
        programHead: null,
        verification: null,
        industryPartner: { companyName: "Old Company", position: null, programId: null },
        alumni: null,
      },
    });

    render(
      <EditUserDialog
        userId="target-user"
        currentUserId="secretary-admin"
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
        programs={FACULTY_PROGRAMS}
        yearLevels={[]}
      />
    );
    await waitFor(() => expect(screen.getByDisplayValue("Legacy Partner")).toBeInTheDocument());
    expect(screen.getByLabelText(/verification status/i)).toHaveTextContent("Not set");
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/verification status must be selected/i);
    expect(editUserBySecretaryAction).not.toHaveBeenCalled();
  });

  it("explains unavailable Student placement when no active enrollment exists", async () => {
    (getUserEditRecordAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "target-user",
        name: "Deferred Student",
        email: "student@acd.edu.ph",
        isActive: true,
        role: SystemRole.STUDENT,
        student: {
          studentIdNumber: "S123",
          programId: "prog-old",
          programCode: "BSIT",
          programName: "Information Technology",
          majorId: null,
          majorName: null,
          programIsActive: true,
          majorIsActive: null,
        },
        activeEnrollment: null,
        faculty: null,
        programHead: null,
        verification: null,
        industryPartner: null,
        alumni: null,
      },
    });

    render(
      <EditUserDialog
        userId="target-user"
        currentUserId="secretary-admin"
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
        programs={[{ id: "prog-old", code: "BSIT", name: "Information Technology", majors: [] }]}
        yearLevels={["FIRST_YEAR"]}
      />
    );
    await waitFor(() => expect(screen.getByDisplayValue("Deferred Student")).toBeInTheDocument());
    expect(screen.getByText(/does not have an active term enrollment/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Year Level")).toBeDisabled();
    expect(screen.getByLabelText("Section")).toBeDisabled();
  });

  it("shows confirmation summary for faculty program change", async () => {
    (getUserEditRecordAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "target-user",
        name: "Jane Smith",
        email: "jane@acd.edu.ph",
        isActive: true,
        role: SystemRole.FACULTY,
        student: null,
        activeEnrollment: null,
        verification: null,
        industryPartner: null,
        alumni: null,
        faculty: { primaryProgramId: "prog-old" },
        programHead: null,
      },
    });

    (editUserBySecretaryAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "target-user",
        protectedConfirmationRequired: true,
        protectedPayload: "FACULTY:program=prog-new",
        token: "test-token",
        confirmationReview: {
          role: SystemRole.FACULTY,
          oldValues: { program: "Information Technology" },
          newValues: { program: "Information Systems" },
        },
      },
    });

    render(
      <EditUserDialog
        userId="target-user"
        currentUserId="secretary-admin"
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
        programs={FACULTY_PROGRAMS}
        yearLevels={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Jane Smith")).toBeInTheDocument();
    });

    // Change the primary program select
    const programSelect = screen.getByLabelText(/primary program affiliation/i);
    fireEvent.click(programSelect);
    fireEvent.click(screen.getByRole("option", { name: "Information Systems" }));

    // Submit to trigger confirmation flow
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/primary program affiliation changes/i)).toBeInTheDocument();
      expect(screen.getByText("Confirm and Save")).toBeInTheDocument();
    });

    // Old and new program names visible in confirmation
    expect(screen.getAllByText("Information Technology").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Information Systems").length).toBeGreaterThan(0);
  });

  it("restores editable form after cancelling confirmation", async () => {
    (getUserEditRecordAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "target-user",
        name: "Jane Smith",
        email: "jane@acd.edu.ph",
        isActive: true,
        role: SystemRole.FACULTY,
        student: null,
        activeEnrollment: null,
        verification: null,
        industryPartner: null,
        alumni: null,
        faculty: { primaryProgramId: "prog-old" },
        programHead: null,
      },
    });
    (editUserBySecretaryAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "target-user",
        protectedConfirmationRequired: true,
        token: "test-token",
        confirmationReview: {
          role: SystemRole.FACULTY,
          oldValues: { program: "Information Technology" },
          newValues: { program: "Information Systems" },
        },
      },
    });

    render(
      <EditUserDialog
        userId="target-user"
        currentUserId="secretary-admin"
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
        programs={FACULTY_PROGRAMS}
        yearLevels={[]}
      />
    );
    await waitFor(() => expect(screen.getByDisplayValue("Jane Smith")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText(/primary program affiliation/i));
    fireEvent.click(screen.getByRole("option", { name: "Information Systems" }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /go back/i })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("button", { name: /confirm and save/i })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: /go back/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/primary program affiliation/i)).toBeInTheDocument();
    });
  });

  it("renders the assignment-set checkbox fieldset for Program Head role and preselects every active assignment", async () => {
    (getUserEditRecordAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "target-user",
        name: "Pat Head",
        email: "pat@acd.edu.ph",
        isActive: true,
        role: SystemRole.PROGRAM_HEAD,
        student: null,
        activeEnrollment: null,
        faculty: null,
        programHead: {
          assignments: [{ programId: "prog-old", programCode: "BSIT", programName: "Information Technology" }],
        },
        verification: null,
        industryPartner: null,
        alumni: null,
      },
    });

    render(
      <EditUserDialog
        userId="target-user"
        currentUserId="secretary-admin"
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
        programs={FACULTY_PROGRAMS}
        yearLevels={[]}
      />
    );

    await waitFor(() => expect(screen.getByDisplayValue("Pat Head")).toBeInTheDocument());

    const fieldset = screen.getByRole("group", { name: /managed programs/i });
    expect(fieldset).toBeInTheDocument();
    const currentAssignment = screen.getByRole("checkbox", {
      name: /information technology/i,
    });
    expect(currentAssignment).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /information systems/i })).not.toBeChecked();
  });

  it("submits the complete checked assignment set from the fieldset", async () => {
    (getUserEditRecordAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "target-user",
        name: "Pat Head",
        email: "pat@acd.edu.ph",
        isActive: true,
        role: SystemRole.PROGRAM_HEAD,
        student: null,
        activeEnrollment: null,
        faculty: null,
        programHead: {
          assignments: [{ programId: "prog-old", programCode: "BSIT", programName: "Information Technology" }],
        },
        verification: null,
        industryPartner: null,
        alumni: null,
      },
    });
    (editUserBySecretaryAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { id: "target-user" },
    });

    render(
      <EditUserDialog
        userId="target-user"
        currentUserId="secretary-admin"
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
        programs={FACULTY_PROGRAMS}
        yearLevels={[]}
      />
    );

    await waitFor(() => expect(screen.getByDisplayValue("Pat Head")).toBeInTheDocument());

    // Add Information Systems to the set, then save
    fireEvent.click(screen.getByRole("checkbox", { name: /information systems/i }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(editUserBySecretaryAction).toHaveBeenCalledTimes(1));
    const submitted = (editUserBySecretaryAction as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as FormData;
    expect(submitted.getAll("program_head.program_ids")).toEqual(["prog-old", "prog-new"]);
    expect(submitted.get("program_head.present")).toBe("1");
  });

  it("submits an empty assignment set when every checkbox is unchecked", async () => {
    (getUserEditRecordAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "target-user",
        name: "Pat Head",
        email: "pat@acd.edu.ph",
        isActive: true,
        role: SystemRole.PROGRAM_HEAD,
        student: null,
        activeEnrollment: null,
        faculty: null,
        programHead: {
          assignments: [{ programId: "prog-old", programCode: "BSIT", programName: "Information Technology" }],
        },
        verification: null,
        industryPartner: null,
        alumni: null,
      },
    });
    (editUserBySecretaryAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { id: "target-user" },
    });

    render(
      <EditUserDialog
        userId="target-user"
        currentUserId="secretary-admin"
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
        programs={FACULTY_PROGRAMS}
        yearLevels={[]}
      />
    );

    await waitFor(() => expect(screen.getByDisplayValue("Pat Head")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("checkbox", { name: /information technology/i }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(editUserBySecretaryAction).toHaveBeenCalledTimes(1));
    const submitted = (editUserBySecretaryAction as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as FormData;
    expect(submitted.getAll("program_head.program_ids")).toEqual([]);
    expect(submitted.get("program_head.present")).toBe("1");
  });

  it("shows Alumni academic and verification controls with access effect wording", async () => {
    (getUserEditRecordAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "target-user",
        name: "Ally Alum",
        email: "ally@gmail.com",
        isActive: true,
        role: SystemRole.ALUMNI,
        student: null,
        activeEnrollment: null,
        faculty: null,
        programHead: null,
        verification: { status: VerificationStatus.PENDING },
        industryPartner: null,
        alumni: { graduationYear: 2020, programId: "prog-old", majorId: null },
      },
    });

    render(
      <EditUserDialog
        userId="target-user"
        currentUserId="secretary-admin"
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
        programs={[
          { id: "prog-old", code: "BSIT", name: "Information Technology", majors: [] },
          {
            id: "prog-new",
            code: "BSIS",
            name: "Information Systems",
            majors: [{ id: "major-1", name: "Data Systems" }],
          },
        ]}
        yearLevels={[]}
      />
    );

    await waitFor(() => expect(screen.getByDisplayValue("Ally Alum")).toBeInTheDocument());
    expect(screen.getByLabelText(/verification status/i)).toHaveTextContent("Pending");
    expect(screen.getByLabelText(/graduation year/i)).toHaveValue(2020);
    expect(screen.getByLabelText(/verification status/i)).toBeInTheDocument();
    expect(
      screen.getByText(/limited dashboard access remains with a review notice/i)
    ).toBeInTheDocument();
  });

  it("shows exact before/after assignment sets in Program Head confirmation", async () => {
    (getUserEditRecordAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "target-user",
        name: "Pat Head",
        email: "pat@acd.edu.ph",
        isActive: true,
        role: SystemRole.PROGRAM_HEAD,
        student: null,
        activeEnrollment: null,
        faculty: null,
        programHead: {
          assignments: [
            { programId: "prog-old", programCode: "BSIT", programName: "Information Technology" },
          ],
        },
        verification: null,
        industryPartner: null,
        alumni: null,
      },
    });
    (editUserBySecretaryAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        protectedConfirmationRequired: true,
        token: "test-token",
        confirmationReview: {
          role: SystemRole.PROGRAM_HEAD,
          oldValues: { programs: "Information Technology" },
          newValues: { programs: "Information Systems, Information Technology" },
        },
      },
    });

    render(
      <EditUserDialog
        userId="target-user"
        currentUserId="secretary-admin"
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
        programs={FACULTY_PROGRAMS}
        yearLevels={[]}
      />
    );

    await waitFor(() => expect(screen.getByDisplayValue("Pat Head")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("checkbox", { name: /information systems/i }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(screen.getByText(/program head assignment changes/i)).toBeInTheDocument()
    );
    expect(screen.getByText("Information Technology")).toBeInTheDocument();
    expect(screen.getByText("Information Systems, Information Technology")).toBeInTheDocument();
    expect(screen.getByText(/assignment set is replaced by the selected set/i)).toBeInTheDocument();
  });
});
