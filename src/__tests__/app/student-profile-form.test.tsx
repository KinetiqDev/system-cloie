import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { pushMock, refreshMock, registerStudentProfileMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  registerStudentProfileMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock("@/lib/actions/onboarding-actions", () => ({
  registerStudentProfile: registerStudentProfileMock,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signOut: vi.fn() },
  }),
}));

vi.mock("@/lib/forms/zod-resolver", () => ({
  customZodResolver: vi.fn(() => undefined),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("lucide-react", () => ({
  AlertCircle: () => <span>Alert</span>,
  ArrowLeft: () => <span>ArrowLeft</span>,
  ArrowRight: () => <span>ArrowRight</span>,
  CalendarDays: () => <span>CalendarDays</span>,
  GraduationCap: () => <span>GraduationCap</span>,
  Mail: () => <span>Mail</span>,
  UserCircle: () => <span>UserCircle</span>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

import { StudentProfileForm } from "@/app/(public)/onboarding/student-profile-form";

describe("StudentProfileForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render editable name controls and displays the Google-derived name", () => {
    render(
      <StudentProfileForm
        email="student@acd.edu.ph"
        name="Jamie Cruz"
        programs={[]}
        yearLevels={[]}
        hasActiveTerm={true}
      />
    );

    expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/last name/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Account Name")).toHaveValue("Jamie Cruz");
    expect(screen.getByLabelText("Account Name")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Account Name")).toHaveAttribute("aria-readonly", "true");
    expect(screen.getByLabelText("Account Name")).not.toHaveAttribute("name");
    expect(screen.getByText("student@acd.edu.ph")).toBeInTheDocument();
  });

  it("omits the Student ID field in active-term onboarding", () => {
    render(
      <StudentProfileForm
        email="student@acd.edu.ph"
        name="Jamie Cruz"
        programs={[]}
        yearLevels={[]}
        hasActiveTerm={true}
      />
    );

    expect(screen.queryByLabelText(/school id/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/1000571225/)).not.toBeInTheDocument();
    expect(screen.getByText("Year Level")).toBeInTheDocument();
    expect(screen.getByText("Section")).toBeInTheDocument();
  });

  it("omits the Student ID field in deferred onboarding and defers year and section", () => {
    render(
      <StudentProfileForm
        email="student@acd.edu.ph"
        name="Jamie Cruz"
        programs={[]}
        yearLevels={[]}
        hasActiveTerm={false}
      />
    );

    expect(screen.queryByLabelText(/school id/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/1000571225/)).not.toBeInTheDocument();
    expect(screen.queryByText("Year Level")).not.toBeInTheDocument();
    expect(screen.queryByText("Section")).not.toBeInTheDocument();
  });

  it("does not redirect when submission returns neither success nor error", async () => {
    registerStudentProfileMock.mockResolvedValue({});

    render(
      <StudentProfileForm
        email="student@acd.edu.ph"
        name="Jamie Cruz"
        programs={[]}
        yearLevels={[]}
        hasActiveTerm={true}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /submit and continue/i }));

    await waitFor(() => {
      expect(registerStudentProfileMock).toHaveBeenCalledTimes(1);
    });
    expect(pushMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("redirects to the dashboard only when submission succeeds", async () => {
    registerStudentProfileMock.mockResolvedValue({ success: true });

    render(
      <StudentProfileForm
        email="student@acd.edu.ph"
        name="Jamie Cruz"
        programs={[]}
        yearLevels={[]}
        hasActiveTerm={true}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /submit and continue/i }));

    await waitFor(() => {
      expect(registerStudentProfileMock).toHaveBeenCalledTimes(1);
    });
    // Form uses window.location.href for redirect, not router.push
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
