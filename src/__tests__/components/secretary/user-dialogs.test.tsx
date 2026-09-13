import { describe, expect, it, vi, beforeEach } from "vitest";
import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SystemRole } from "@prisma/client";
import { UserDialogs } from "@/features/users/components/secretary-users-list/user-dialogs";
import {
  addRoleToExistingUserAction,
  removeRoleFromUserAction,
} from "@/lib/actions/management-foundation-actions";
import { showToast } from "@/components/ui/toast";
import type { SecretaryUserSummaryItem } from "@/features/users/services/list-secretary-users-summary";

vi.mock("@/lib/actions/management-foundation-actions", () => ({
  addRoleToExistingUserAction: vi.fn(),
  removeRoleFromUserAction: vi.fn(),
  toggleUserActiveAction: vi.fn(),
}));

vi.mock("@/components/ui/toast", () => ({
  showToast: vi.fn(),
}));

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
      <div
        role="option"
        aria-selected={ctx.value === value}
        onClick={() => ctx.onValueChange?.(value)}
      >
        {children}
      </div>
    );
  }
  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.stubGlobal(
  "matchMedia",
  vi.fn((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
);

const USER: SecretaryUserSummaryItem = {
  id: "user-1",
  name: "Maria Multi",
  email: "maria@acd.edu.ph",
  isActive: true,
  roles: [SystemRole.FACULTY, SystemRole.PROGRAM_HEAD],
  activeRole: SystemRole.FACULTY,
  programLabel: "BSIT",
  majorLabel: "N/A",
  placement: null,
};

const PROGRAMS = [{ id: "prog-1", code: "BSIT", name: "Information Technology", majors: [] }];

describe("UserDialogs role management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revokes a role after confirmation and adds a role with its context", async () => {
    vi.mocked(removeRoleFromUserAction).mockResolvedValue({ success: true });
    vi.mocked(addRoleToExistingUserAction).mockResolvedValue({ success: true });

    render(
      <UserDialogs
        viewUser={USER}
        onCloseView={vi.fn()}
        onUserUpdated={vi.fn()}
        programs={PROGRAMS}
      />
    );

    expect(screen.getByText("Faculty")).toBeInTheDocument();
    expect(screen.getByText("Program Head")).toBeInTheDocument();

    // Revoke: the row asks for confirmation before calling the action.
    fireEvent.click(screen.getByRole("button", { name: /revoke program head role/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^revoke role$/i }));

    await waitFor(() =>
      expect(removeRoleFromUserAction).toHaveBeenCalledWith("user-1", SystemRole.PROGRAM_HEAD)
    );
    await waitFor(() => expect(screen.queryByText("Program Head")).not.toBeInTheDocument());
    expect(showToast).toHaveBeenCalledWith("Program Head access has been revoked.");

    // Add: a role that needs no program context submits straight through.
    fireEvent.click(screen.getByRole("button", { name: /add role/i }));
    fireEvent.click(await screen.findByRole("option", { name: "Dean" }));
    fireEvent.click(screen.getByRole("button", { name: "Add role" }));

    await waitFor(() => expect(addRoleToExistingUserAction).toHaveBeenCalledTimes(1));
    const formData = vi.mocked(addRoleToExistingUserAction).mock.calls[0][0];
    expect(formData.get("user_id")).toBe("user-1");
    expect(formData.get("role")).toBe(SystemRole.DEAN);
    await waitFor(() => expect(screen.getByText("Dean")).toBeInTheDocument());
  });

  it("surfaces a blocked revocation as an error toast and keeps the role", async () => {
    vi.mocked(removeRoleFromUserAction).mockResolvedValue({
      success: false,
      error: "Deactivate all faculty-program affiliations before revoking the Faculty role.",
    });

    render(
      <UserDialogs
        viewUser={USER}
        onCloseView={vi.fn()}
        onUserUpdated={vi.fn()}
        programs={PROGRAMS}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /revoke faculty role/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^revoke role$/i }));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        "Deactivate all faculty-program affiliations before revoking the Faculty role.",
        "error"
      )
    );
    expect(screen.getByText("Faculty")).toBeInTheDocument();
  });

  it("blocks adding a Student role until its program context is chosen", async () => {
    render(
      <UserDialogs
        viewUser={USER}
        onCloseView={vi.fn()}
        onUserUpdated={vi.fn()}
        programs={PROGRAMS}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /add role/i }));
    fireEvent.click(await screen.findByRole("option", { name: "Student" }));
    fireEvent.click(screen.getByRole("button", { name: "Add role" }));

    expect(await screen.findByText("Student requires a program.")).toBeInTheDocument();
    expect(addRoleToExistingUserAction).not.toHaveBeenCalled();
  });
});
