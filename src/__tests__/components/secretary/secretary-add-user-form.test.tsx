import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StudentSection, SystemRole, YearLevel } from "@prisma/client";
import { AddUserForm } from "@/features/users/components/secretary-add-user-form";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

// Mock the Base UI-backed Select with a lightweight, test-friendly version so
// role selection can be exercised without relying on pointer/keyboard internals.
const SelectContext = React.createContext<{
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
      <SelectContext.Provider value={{ onValueChange }}>
        <span data-testid="select-value" data-value={value ?? ""}>
          {children}
        </span>
      </SelectContext.Provider>
    );
  }

  function SelectTrigger({ children }: { children: React.ReactNode }) {
    return (
      <button type="button" role="combobox" aria-expanded="false" aria-controls="role-listbox">
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
    return <span>{children ?? placeholder}</span>;
  }

  function SelectContent({ children }: { children: React.ReactNode }) {
    return (
      <div id="role-listbox" role="listbox">
        {children}
      </div>
    );
  }

  function SelectItem({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) {
    const ctx = React.useContext(SelectContext);
    return (
      <div
        role="option"
        aria-selected="false"
        data-value={value}
        onClick={() => ctx.onValueChange?.(value)}
      >
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
    SelectGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectLabel: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectSeparator: () => null,
    SelectScrollUpButton: () => null,
    SelectScrollDownButton: () => null,
  };
});

describe("SecretaryAddUserForm base roles", () => {
  const mockCreateAction = vi.fn();

  beforeEach(() => {
    mockCreateAction.mockReset();
  });

  function renderForm(createAction = mockCreateAction) {
    return render(<AddUserForm programs={[]} createAction={createAction} />);
  }

  function selectRole(roleLabel: string) {
    fireEvent.click(screen.getByRole("option", { name: new RegExp(roleLabel, "i") }));
  }

  it("shows only base identity fields for Secretary", async () => {
    renderForm();

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();

    selectRole("Secretary");

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveTextContent(/secretary/i);
    });
    expect(screen.queryByLabelText(/affiliated program/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/major/i)).not.toBeInTheDocument();
  });

  it("shows only base identity fields for College Dean", async () => {
    renderForm();

    selectRole("College Dean");

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveTextContent(/college dean/i);
    });
    expect(screen.queryByLabelText(/affiliated program/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/major/i)).not.toBeInTheDocument();
  });

  it("shows validation errors for missing required fields", async () => {
    renderForm();
    selectRole("Secretary");

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it("shows domain validation error for a non-ACD email on Dean", async () => {
    renderForm();
    selectRole("College Dean");

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Doe" } });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "dean@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText(/acd institutional email/i)).toBeInTheDocument();
    });
  });

  it("submits a valid Secretary account and redirects on success", async () => {
    mockCreateAction.mockResolvedValue({ success: true });
    renderForm();

    selectRole("Secretary");

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Doe" } });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "secretary@acd.edu.ph" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(mockCreateAction).toHaveBeenCalledTimes(1);
    });

    const formData = mockCreateAction.mock.calls[0][0] as FormData;
    expect(formData.get("first_name")).toBe("Jane");
    expect(formData.get("last_name")).toBe("Doe");
    expect(formData.get("email")).toBe("secretary@acd.edu.ph");
    expect(formData.get("role")).toBe(SystemRole.SECRETARY);
  });

  it("submits a valid Dean account", async () => {
    mockCreateAction.mockResolvedValue({ success: true });
    renderForm();

    selectRole("College Dean");

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "John" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Smith" } });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "dean@acdeducation.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(mockCreateAction).toHaveBeenCalledTimes(1);
    });

    const formData = mockCreateAction.mock.calls[0][0] as FormData;
    expect(formData.get("role")).toBe(SystemRole.DEAN);
    expect(formData.get("email")).toBe("dean@acdeducation.com");
  });

  it("shows the institutional email helper for all roles", () => {
    renderForm();
    expect(screen.getByText(/internal roles require an @acd.edu.ph/i)).toBeInTheDocument();
  });

  it("disables the submit button and shows a loading state while submitting", async () => {
    mockCreateAction.mockImplementation(() => new Promise(() => {}));
    renderForm();

    selectRole("Secretary");
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Doe" } });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "secretary@acd.edu.ph" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: /creating user/i });
      expect(submitButton).toBeDisabled();
    });
  });

  it("renders a global error alert when the server action fails", async () => {
    mockCreateAction.mockResolvedValue({ success: false, error: "A user with this email already exists." });
    renderForm();

    selectRole("Secretary");
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Doe" } });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "secretary@acd.edu.ph" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/already exists/i);
    });
  });

  it("uses a full-width submit button on small viewports", () => {
    renderForm();
    expect(screen.getByRole("button", { name: /create user/i })).toHaveClass("w-full");
  });
});

const programs = [
  {
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    code: "BSIT",
    name: "Bachelor of Science in Information Technology",
    majors: [{ id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10", name: "Web Development" }],
  },
  {
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
    code: "BSBA",
    name: "Bachelor of Science in Business Administration",
    majors: [],
  },
];

describe("SecretaryAddUserForm Program Head and Faculty", () => {
  const mockCreateAction = vi.fn();

  beforeEach(() => {
    mockCreateAction.mockReset();
  });

  function renderForm(createAction = mockCreateAction) {
    return render(<AddUserForm programs={programs} createAction={createAction} />);
  }

  function selectRole(roleLabel: string) {
    fireEvent.click(screen.getByRole("option", { name: new RegExp(roleLabel, "i") }));
  }

  function selectProgram(programCode: string) {
    fireEvent.click(
      screen.getByRole("option", { name: new RegExp(`^${programCode} —`, "i") })
    );
  }

  function fillIdentity() {
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Doe" } });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "user@acd.edu.ph" },
    });
  }

  it("shows a single program field and no major field for Program Head", async () => {
    renderForm();

    selectRole("Program Head");

    await waitFor(() => {
      expect(screen.getByText(/affiliated program/i)).toBeInTheDocument();
    });
    expect(screen.queryByText("Major")).not.toBeInTheDocument();
  });

  it("shows a single program field and no major field for Faculty", async () => {
    renderForm();

    selectRole("Faculty");

    await waitFor(() => {
      expect(screen.getByText(/affiliated program/i)).toBeInTheDocument();
    });
    expect(screen.queryByText("Major")).not.toBeInTheDocument();
  });

  it("shows a validation error when Program Head program is missing", async () => {
    renderForm();

    selectRole("Program Head");
    fillIdentity();

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText(/select an affiliated program/i)).toBeInTheDocument();
    });
  });

  it("shows a validation error when Faculty program is missing", async () => {
    renderForm();

    selectRole("Faculty");
    fillIdentity();

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText(/select an affiliated program/i)).toBeInTheDocument();
    });
  });

  it("submits a valid Program Head account with a managed program", async () => {
    mockCreateAction.mockResolvedValue({ success: true });
    renderForm();

    selectRole("Program Head");
    fillIdentity();
    selectProgram("BSIT");

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(mockCreateAction).toHaveBeenCalledTimes(1);
    });

    const formData = mockCreateAction.mock.calls[0][0] as FormData;
    expect(formData.get("role")).toBe(SystemRole.PROGRAM_HEAD);
    expect(formData.get("program_id")).toBe("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
  });

  it("submits a valid Faculty account with a primary program", async () => {
    mockCreateAction.mockResolvedValue({ success: true });
    renderForm();

    selectRole("Faculty");
    fillIdentity();
    selectProgram("BSBA");

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(mockCreateAction).toHaveBeenCalledTimes(1);
    });

    const formData = mockCreateAction.mock.calls[0][0] as FormData;
    expect(formData.get("role")).toBe(SystemRole.FACULTY);
    expect(formData.get("program_id")).toBe("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22");
  });

  it("clears stale program data when switching away from Faculty before submit", async () => {
    mockCreateAction.mockResolvedValue({ success: true });
    renderForm();

    selectRole("Faculty");
    fillIdentity();
    selectProgram("BSIT");

    // Switch to a base role that does not use program data
    selectRole("Secretary");

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(mockCreateAction).toHaveBeenCalledTimes(1);
    });

    const formData = mockCreateAction.mock.calls[0][0] as FormData;
    expect(formData.get("role")).toBe(SystemRole.SECRETARY);
    expect(formData.get("program_id")).toBeNull();
    expect(formData.getAll("program_ids")).toHaveLength(0);
  });
});

describe("SecretaryAddUserForm Student", () => {
  const mockCreateAction = vi.fn();

  beforeEach(() => {
    mockCreateAction.mockReset();
  });

  function renderForm(createAction = mockCreateAction) {
    return render(<AddUserForm programs={programs} createAction={createAction} />);
  }

  function selectRole(roleLabel: string) {
    fireEvent.click(screen.getByRole("option", { name: new RegExp(roleLabel, "i") }));
  }

  function selectProgram(programCode: string) {
    fireEvent.click(
      screen.getByRole("option", { name: new RegExp(`^${programCode} —`, "i") })
    );
  }

  function selectMajor(majorName: string) {
    fireEvent.click(screen.getByRole("option", { name: new RegExp(majorName, "i") }));
  }

  function selectYearLevel(label: string) {
    fireEvent.click(screen.getByRole("option", { name: new RegExp(`^${label}$`, "i") }));
  }

  function selectSection(label: string) {
    fireEvent.click(screen.getByRole("option", { name: new RegExp(`^${label}$`, "i") }));
  }

  function fillIdentity(email = "student@acd.edu.ph") {
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Carlos" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Santos" } });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: email },
    });
  }

  it("shows Student-specific fields when role is Student", async () => {
    renderForm();

    selectRole("Student");

    await waitFor(() => {
      expect(screen.getByText(/academic program/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/student id number/i)).toBeInTheDocument();
    expect(screen.getByText(/^Year Level$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Section$/i)).toBeInTheDocument();
  });

  it("shows major field when the selected Student program has active majors", async () => {
    renderForm();

    selectRole("Student");
    selectProgram("BSIT");

    await waitFor(() => {
      expect(screen.getByText("Major")).toBeInTheDocument();
    });
  });

  it("hides major field when the selected Student program has no active majors", async () => {
    renderForm();

    selectRole("Student");
    selectProgram("BSBA");

    await waitFor(() => {
      expect(screen.queryByText("Major")).not.toBeInTheDocument();
    });
  });

  it("shows validation errors when required Student fields are missing", async () => {
    renderForm();

    selectRole("Student");
    fillIdentity();

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText(/select an affiliated program/i)).toBeInTheDocument();
      expect(screen.getByText(/student id number is required/i)).toBeInTheDocument();
      expect(screen.getByText(/year level is required/i)).toBeInTheDocument();
      expect(screen.getByText(/section is required/i)).toBeInTheDocument();
    });
  });

  it("shows a field-level error when a Student program with majors is submitted without a major", async () => {
    mockCreateAction.mockResolvedValue({ success: true });
    renderForm();

    selectRole("Student");
    fillIdentity();
    selectProgram("BSIT");
    fireEvent.change(screen.getByLabelText(/student id number/i), {
      target: { value: "2024-0001" },
    });
    selectYearLevel("1st Year");
    selectSection("Morning");

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText(/select a major for this program/i)).toBeInTheDocument();
    });
    expect(mockCreateAction).not.toHaveBeenCalled();
  });

  it("resets stale major selection when the Student program changes", async () => {
    mockCreateAction.mockResolvedValue({ success: true });
    renderForm();

    selectRole("Student");
    fillIdentity();
    selectProgram("BSIT");
    selectMajor("Web Development");

    // Switch to a program with no majors
    selectProgram("BSBA");

    fireEvent.change(screen.getByLabelText(/student id number/i), {
      target: { value: "2024-0001" },
    });
    selectYearLevel("1st Year");
    selectSection("Morning");

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(mockCreateAction).toHaveBeenCalledTimes(1);
    });

    const formData = mockCreateAction.mock.calls[0][0] as FormData;
    expect(formData.get("role")).toBe(SystemRole.STUDENT);
    expect(formData.get("program_id")).toBe("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22");
    expect(formData.get("major_id")).toBeNull();
  });

  it("submits a valid Student account without major when program has no majors", async () => {
    mockCreateAction.mockResolvedValue({ success: true });
    renderForm();

    selectRole("Student");
    fillIdentity();
    selectProgram("BSBA");
    fireEvent.change(screen.getByLabelText(/student id number/i), {
      target: { value: "2024-0001" },
    });
    selectYearLevel("1st Year");
    selectSection("Morning");

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(mockCreateAction).toHaveBeenCalledTimes(1);
    });

    const formData = mockCreateAction.mock.calls[0][0] as FormData;
    expect(formData.get("role")).toBe(SystemRole.STUDENT);
    expect(formData.get("email")).toBe("student@acd.edu.ph");
    expect(formData.get("program_id")).toBe("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22");
    expect(formData.get("student_id_number")).toBe("2024-0001");
    expect(formData.get("year_level")).toBe(YearLevel.FIRST_YEAR);
    expect(formData.get("section")).toBe(StudentSection.MORNING);
    expect(formData.get("major_id")).toBeNull();
  });

  it("submits a valid Student account with major when program has majors", async () => {
    mockCreateAction.mockResolvedValue({ success: true });
    renderForm();

    selectRole("Student");
    fillIdentity();
    selectProgram("BSIT");
    selectMajor("Web Development");
    fireEvent.change(screen.getByLabelText(/student id number/i), {
      target: { value: "2024-0002" },
    });
    selectYearLevel("2nd Year");
    selectSection("Afternoon");

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(mockCreateAction).toHaveBeenCalledTimes(1);
    });

    const formData = mockCreateAction.mock.calls[0][0] as FormData;
    expect(formData.get("role")).toBe(SystemRole.STUDENT);
    expect(formData.get("program_id")).toBe("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
    expect(formData.get("major_id")).toBe("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10");
    expect(formData.get("student_id_number")).toBe("2024-0002");
    expect(formData.get("year_level")).toBe(YearLevel.SECOND_YEAR);
    expect(formData.get("section")).toBe(StudentSection.AFTERNOON);
  });

  it("clears stale Student fields when switching away from Student before submit", async () => {
    mockCreateAction.mockResolvedValue({ success: true });
    renderForm();

    selectRole("Student");
    fillIdentity();
    selectProgram("BSIT");
    selectMajor("Web Development");
    fireEvent.change(screen.getByLabelText(/student id number/i), {
      target: { value: "2024-0001" },
    });
    selectYearLevel("1st Year");
    selectSection("Morning");

    // Switch to a base role
    selectRole("Secretary");

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(mockCreateAction).toHaveBeenCalledTimes(1);
    });

    const formData = mockCreateAction.mock.calls[0][0] as FormData;
    expect(formData.get("role")).toBe(SystemRole.SECRETARY);
    expect(formData.get("program_id")).toBeNull();
    expect(formData.get("major_id")).toBeNull();
    expect(formData.get("student_id_number")).toBeNull();
    expect(formData.get("year_level")).toBeNull();
    expect(formData.get("section")).toBeNull();
    expect(formData.getAll("program_ids")).toHaveLength(0);
  });
});

describe("SecretaryAddUserForm Alumni", () => {
  const mockCreateAction = vi.fn();

  beforeEach(() => {
    mockCreateAction.mockReset();
  });

  function renderForm(createAction = mockCreateAction) {
    return render(<AddUserForm programs={programs} createAction={createAction} />);
  }

  function selectRole(roleLabel: string) {
    fireEvent.click(screen.getByRole("option", { name: new RegExp(roleLabel, "i") }));
  }

  function selectProgram(programCode: string) {
    fireEvent.click(
      screen.getByRole("option", { name: new RegExp(`^${programCode} —`, "i") })
    );
  }

  function selectMajor(majorName: string) {
    fireEvent.click(screen.getByRole("option", { name: new RegExp(majorName, "i") }));
  }

  function fillIdentity(email = "alumni@example.com") {
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ally" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Santos" } });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: email },
    });
  }

  it("shows Alumni-specific fields and hides irrelevant Student fields", async () => {
    renderForm();

    selectRole("Alumni");

    await waitFor(() => {
      expect(screen.getByText(/affiliated program/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/graduation year/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/student id number/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Year Level$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Section$/i)).not.toBeInTheDocument();
  });

  it("shows major field when the selected Alumni program has active majors", async () => {
    renderForm();

    selectRole("Alumni");
    selectProgram("BSIT");

    await waitFor(() => {
      expect(screen.getByText("Major")).toBeInTheDocument();
    });
  });

  it("hides major field when the selected Alumni program has no active majors", async () => {
    renderForm();

    selectRole("Alumni");
    selectProgram("BSBA");

    await waitFor(() => {
      expect(screen.queryByText("Major")).not.toBeInTheDocument();
    });
  });

  it("shows validation errors when required Alumni fields are missing", async () => {
    renderForm();

    selectRole("Alumni");
    fillIdentity();

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText(/select an affiliated program/i)).toBeInTheDocument();
      expect(screen.getByText(/graduation year is required/i)).toBeInTheDocument();
    });
  });

  it("resets stale major selection when the Alumni program changes", async () => {
    mockCreateAction.mockResolvedValue({ success: true });
    renderForm();

    selectRole("Alumni");
    fillIdentity();
    selectProgram("BSIT");
    selectMajor("Web Development");

    // Switch to a program with no majors
    selectProgram("BSBA");

    fireEvent.change(screen.getByLabelText(/graduation year/i), {
      target: { value: "2022" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(mockCreateAction).toHaveBeenCalledTimes(1);
    });

    const formData = mockCreateAction.mock.calls[0][0] as FormData;
    expect(formData.get("role")).toBe(SystemRole.ALUMNI);
    expect(formData.get("program_id")).toBe("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22");
    expect(formData.get("major_id")).toBeNull();
    expect(formData.get("graduation_year")).toBe("2022");
  });

  it("submits a valid Alumni account without major when program has no majors", async () => {
    mockCreateAction.mockResolvedValue({ success: true });
    renderForm();

    selectRole("Alumni");
    fillIdentity("alumni@example.org");
    selectProgram("BSBA");
    fireEvent.change(screen.getByLabelText(/graduation year/i), {
      target: { value: "2023" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(mockCreateAction).toHaveBeenCalledTimes(1);
    });

    const formData = mockCreateAction.mock.calls[0][0] as FormData;
    expect(formData.get("role")).toBe(SystemRole.ALUMNI);
    expect(formData.get("email")).toBe("alumni@example.org");
    expect(formData.get("program_id")).toBe("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22");
    expect(formData.get("graduation_year")).toBe("2023");
    expect(formData.get("major_id")).toBeNull();
  });

  it("submits a valid Alumni account with major when program has majors", async () => {
    mockCreateAction.mockResolvedValue({ success: true });
    renderForm();

    selectRole("Alumni");
    fillIdentity("alumni@gmail.com");
    selectProgram("BSIT");
    selectMajor("Web Development");
    fireEvent.change(screen.getByLabelText(/graduation year/i), {
      target: { value: "2022" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(mockCreateAction).toHaveBeenCalledTimes(1);
    });

    const formData = mockCreateAction.mock.calls[0][0] as FormData;
    expect(formData.get("role")).toBe(SystemRole.ALUMNI);
    expect(formData.get("program_id")).toBe("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
    expect(formData.get("major_id")).toBe("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10");
    expect(formData.get("graduation_year")).toBe("2022");
  });

  it("clears stale Alumni fields when switching away from Alumni before submit", async () => {
    mockCreateAction.mockResolvedValue({ success: true });
    renderForm();

    selectRole("Alumni");
    fillIdentity("secretary@acd.edu.ph");
    selectProgram("BSIT");
    selectMajor("Web Development");
    fireEvent.change(screen.getByLabelText(/graduation year/i), {
      target: { value: "2022" },
    });

    // Switch to a base role
    selectRole("Secretary");

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(mockCreateAction).toHaveBeenCalledTimes(1);
    });

    const formData = mockCreateAction.mock.calls[0][0] as FormData;
    expect(formData.get("role")).toBe(SystemRole.SECRETARY);
    expect(formData.get("program_id")).toBeNull();
    expect(formData.get("major_id")).toBeNull();
    expect(formData.get("graduation_year")).toBeNull();
    expect(formData.getAll("program_ids")).toHaveLength(0);
  });
});

describe("SecretaryAddUserForm Industry Partner", () => {
  const mockCreateAction = vi.fn();

  beforeEach(() => {
    mockCreateAction.mockReset();
  });

  function renderForm(createAction = mockCreateAction) {
    return render(<AddUserForm programs={programs} createAction={createAction} />);
  }

  function selectRole(roleLabel: string) {
    fireEvent.click(screen.getByRole("option", { name: new RegExp(roleLabel, "i") }));
  }

  function selectProgram(programCode: string) {
    fireEvent.click(
      screen.getByRole("option", { name: new RegExp(`^${programCode} —`, "i") })
    );
  }

  function fillIdentity(email = "partner@external-company.com") {
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Pat" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Partner" } });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: email },
    });
  }

  it("shows Industry Partner-specific fields and hides irrelevant Student/Alumni fields", async () => {
    renderForm();

    selectRole("Industry Partner");

    await waitFor(() => {
      expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/position/i)).toBeInTheDocument();
    expect(screen.getByText(/affiliated program/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/student id number/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/graduation year/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Year Level$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Section$/i)).not.toBeInTheDocument();
  });

  it("marks optional Industry Partner fields with an optional indicator", async () => {
    renderForm();

    selectRole("Industry Partner");

    await waitFor(() => {
      expect(screen.getByText(/affiliated program/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/affiliated program/i)).toHaveTextContent(/optional/i);
    expect(screen.getByText(/position \/ title/i)).toHaveTextContent(/optional/i);
  });

  it("shows validation error when company name is missing", async () => {
    renderForm();

    selectRole("Industry Partner");
    fillIdentity();

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText(/company or organization name is required/i)).toBeInTheDocument();
    });
  });

  it("submits a valid Industry Partner account with optional program and position", async () => {
    mockCreateAction.mockResolvedValue({ success: true });
    renderForm();

    selectRole("Industry Partner");
    fillIdentity();
    selectProgram("BSIT");
    fireEvent.change(screen.getByLabelText(/company/i), {
      target: { value: "External Company" },
    });
    fireEvent.change(screen.getByLabelText(/position/i), {
      target: { value: "Hiring Manager" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(mockCreateAction).toHaveBeenCalledTimes(1);
    });

    const formData = mockCreateAction.mock.calls[0][0] as FormData;
    expect(formData.get("role")).toBe(SystemRole.INDUSTRY_PARTNER);
    expect(formData.get("email")).toBe("partner@external-company.com");
    expect(formData.get("company_name")).toBe("External Company");
    expect(formData.get("position")).toBe("Hiring Manager");
    expect(formData.get("program_id")).toBe("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
  });

  it("submits a valid Industry Partner account without optional program or position", async () => {
    mockCreateAction.mockResolvedValue({ success: true });
    renderForm();

    selectRole("Industry Partner");
    fillIdentity("partner@example.org");
    fireEvent.change(screen.getByLabelText(/company/i), {
      target: { value: "Solo Firm" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(mockCreateAction).toHaveBeenCalledTimes(1);
    });

    const formData = mockCreateAction.mock.calls[0][0] as FormData;
    expect(formData.get("role")).toBe(SystemRole.INDUSTRY_PARTNER);
    expect(formData.get("email")).toBe("partner@example.org");
    expect(formData.get("company_name")).toBe("Solo Firm");
    expect(formData.get("position")).toBeNull();
    expect(formData.get("program_id")).toBeNull();
  });

  it("clears stale Industry Partner fields when switching away before submit", async () => {
    mockCreateAction.mockResolvedValue({ success: true });
    renderForm();

    selectRole("Industry Partner");
    fillIdentity("secretary@acd.edu.ph");
    selectProgram("BSIT");
    fireEvent.change(screen.getByLabelText(/company/i), {
      target: { value: "External Company" },
    });
    fireEvent.change(screen.getByLabelText(/position/i), {
      target: { value: "Hiring Manager" },
    });

    // Switch to a base role
    selectRole("Secretary");

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(mockCreateAction).toHaveBeenCalledTimes(1);
    });

    const formData = mockCreateAction.mock.calls[0][0] as FormData;
    expect(formData.get("role")).toBe(SystemRole.SECRETARY);
    expect(formData.get("program_id")).toBeNull();
    expect(formData.get("company_name")).toBeNull();
    expect(formData.get("position")).toBeNull();
    expect(formData.getAll("program_ids")).toHaveLength(0);
  });
});
