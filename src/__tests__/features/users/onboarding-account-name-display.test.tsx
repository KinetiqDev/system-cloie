import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/alumni-actions", () => ({
  createAlumniProfile: vi.fn(),
}));
vi.mock("@/lib/actions/industry-partner-actions", () => ({
  createIndustryPartnerProfile: vi.fn(),
}));
vi.mock("@/lib/actions/faculty-actions", () => ({
  createFacultyProfile: vi.fn(),
}));
vi.mock("@/lib/actions/onboarding-actions", () => ({
  resetIncompleteRoleClaim: vi.fn(),
}));
vi.mock("@/lib/forms/zod-resolver", () => ({
  customZodResolver: vi.fn(() => undefined),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));
vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
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
vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  SelectValue: ({
    children,
    placeholder,
  }: {
    children?: React.ReactNode;
    placeholder?: string;
  }) => <span>{children ?? placeholder}</span>,
}));

import { AlumniOnboardingForm } from "@/features/users/components/alumni-onboarding-form";
import { FacultyOnboardingForm } from "@/features/users/components/faculty-onboarding-form";
import { IndustryPartnerOnboardingForm } from "@/features/users/components/industry-partner-onboarding-form";

describe("role onboarding account identity", () => {
  const accountName = "Jamie Cruz";

  it.each([
    [
      "alumni",
      <AlumniOnboardingForm
        key="alumni"
        email="alumni@example.com"
        name={accountName}
        programs={[]}
      />,
    ],
    [
      "faculty",
      <FacultyOnboardingForm
        key="faculty"
        email="faculty@acd.edu.ph"
        name={accountName}
        programs={[]}
      />,
    ],
    [
      "industry partner",
      <IndustryPartnerOnboardingForm
        key="industry-partner"
        email="partner@example.com"
        name={accountName}
        programs={[]}
      />,
    ],
  ])("displays the canonical name read-only for %s onboarding", (_role, form) => {
    render(form);

    const input = screen.getByLabelText("Account Name");
    expect(input).toHaveValue(accountName);
    expect(input).toHaveAttribute("readonly");
    expect(input).toHaveAttribute("aria-readonly", "true");
    expect(input).not.toHaveAttribute("name");
  });

  it("labels the industry partner no-program selection as None", () => {
    render(
      <IndustryPartnerOnboardingForm email="partner@example.com" name={accountName} programs={[]} />
    );

    expect(screen.getByText("None")).toBeInTheDocument();
    expect(screen.queryByText("__none")).not.toBeInTheDocument();
  });
});
