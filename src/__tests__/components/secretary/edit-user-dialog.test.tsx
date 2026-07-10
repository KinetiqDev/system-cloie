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
}>({});

vi.mock("@/components/ui/select", () => {
  function Select({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
  }) {
    return (
      <SelectContext.Provider value={{ value, onValueChange }}>
        <span data-testid="select-value" data-value={value ?? ""}>
          {children}
        </span>
      </SelectContext.Provider>
    );
  }
  function SelectTrigger({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
      <button type="button" role="combobox" aria-expanded="false" {...props}>
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
        programs={[]}
        yearLevels={[]}
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
      expect(screen.getByDisplayValue("John")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Johnny" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(editUserBySecretaryAction).toHaveBeenCalledTimes(1);
    });

    const formData = (editUserBySecretaryAction as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as FormData;
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

    expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument();
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
        firstName: "Jane",
        lastName: "Smith",
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
      expect(screen.getByDisplayValue("Jane")).toBeInTheDocument();
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
        firstName: "Abbegail",
        lastName: "Abebon",
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

    await waitFor(() => expect(screen.getByDisplayValue("Abbegail")).toBeInTheDocument());

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
        firstName: "Pat",
        lastName: "Partner",
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

  it("shows confirmation summary for faculty program change", async () => {
    (getUserEditRecordAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "target-user",
        firstName: "Jane",
        lastName: "Smith",
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
      expect(screen.getByDisplayValue("Jane")).toBeInTheDocument();
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

  it("shows managed-program control for Program Head role", async () => {
    (getUserEditRecordAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "target-user",
        firstName: "Pat",
        lastName: "Head",
        email: "pat@acd.edu.ph",
        isActive: true,
        role: SystemRole.PROGRAM_HEAD,
        student: null,
        activeEnrollment: null,
        faculty: null,
        programHead: { assignmentProgramId: "prog-old" },
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

    await waitFor(() => expect(screen.getByDisplayValue("Pat")).toBeInTheDocument());
    expect(screen.getByLabelText(/managed program/i)).toBeInTheDocument();
    expect(
      screen.getByText(/other program heads and course assignments remain unchanged/i)
    ).toBeInTheDocument();
  });

  it("shows Alumni academic and verification controls with access effect wording", async () => {
    (getUserEditRecordAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "target-user",
        firstName: "Ally",
        lastName: "Alum",
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

    await waitFor(() => expect(screen.getByDisplayValue("Ally")).toBeInTheDocument());
    expect(screen.getByLabelText(/verification status/i)).toHaveTextContent("Pending");
    expect(screen.getByLabelText(/graduation year/i)).toHaveValue(2020);
    expect(screen.getByLabelText(/verification status/i)).toBeInTheDocument();
    expect(
      screen.getByText(/limited dashboard access remains with a review notice/i)
    ).toBeInTheDocument();
  });

  it("shows assignment-history effect in Program Head confirmation", async () => {
    (getUserEditRecordAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "target-user",
        firstName: "Pat",
        lastName: "Head",
        email: "pat@acd.edu.ph",
        isActive: true,
        role: SystemRole.PROGRAM_HEAD,
        student: null,
        activeEnrollment: null,
        faculty: null,
        programHead: { assignmentProgramId: "prog-old" },
        verification: null,
        industryPartner: null,
        alumni: null,
      },
    });
    (editUserBySecretaryAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { protectedConfirmationRequired: true, token: "test-token" },
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

    await waitFor(() => expect(screen.getByDisplayValue("Pat")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText(/managed program/i));
    fireEvent.click(screen.getByRole("option", { name: "Information Systems" }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(screen.getByText(/program head assignment changes/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/previous assignment becomes inactive/i)).toBeInTheDocument();
  });
});
