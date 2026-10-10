import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import StudentLandingPage from "@/app/(public)/entry/student/page";
import StaffLandingPage from "@/app/(public)/entry/staff/page";
import ExternalLandingPage from "@/app/(public)/entry/external/page";
import StudentLoginPage from "@/app/(public)/login/student/page";
import StaffLoginPage from "@/app/(public)/login/staff/page";
import FacultyRegisterPage from "@/app/(public)/register/faculty/page";
import ExternalLoginPage from "@/app/(public)/login/external/page";
import ExternalRegisterPage from "@/app/(public)/register/external/page";
import VerifyEmailPage from "@/app/(public)/verify-email/page";
import ForgotPasswordPage from "@/app/(public)/forgot-password/page";
import ResetPasswordPage from "@/app/(public)/reset-password/page";

const { resolveAuthSessionMock, cookieGetMock, requireLegalMock } = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  cookieGetMock: vi.fn(),
  requireLegalMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookieGetMock })),
}));

vi.mock("@/features/legal/services/require-legal-acknowledgement", () => ({
  requireLegalAcknowledgement: requireLegalMock,
}));

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- Mocking next/image in test environment
  default: (props: React.ComponentProps<"img">) => <img alt={props.alt ?? ""} {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/features/auth/services/resolve-post-login-destination", () => ({
  resolvePostLoginDestination: vi.fn(() => "/student/dashboard"),
}));

const emptyParams = Promise.resolve({});

describe("Public entry routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue(null);
    cookieGetMock.mockReturnValue(undefined);
    requireLegalMock.mockResolvedValue({
      acknowledged: false,
      reason: "missing-or-invalid-intent",
    });
  });

  it("student landing offers only student sign-in and no registration", () => {
    render(<StudentLandingPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Students" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Student sign in" })).toHaveAttribute(
      "href",
      "/login/student"
    );
    expect(screen.getByRole("link", { name: "Choose another audience" })).toHaveAttribute(
      "href",
      "/"
    );
    expect(screen.getByText(/Secretary's office sets up your account/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: /staff|faculty|alumni|partner|register|create an account/i,
      })
    ).toBeNull();
  });

  it("student entrance offers a single ACD Google action with Secretary guidance", async () => {
    render(await StudentLoginPage());
    expect(screen.getByRole("heading", { level: 1, name: "Student sign in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue with ACD Google/i })).toHaveClass(
      "h-10",
      "text-sm",
      "pointer-coarse:h-11"
    );
    expect(screen.getByRole("link", { name: "Students" })).toHaveClass(
      "h-10",
      "pointer-coarse:h-11"
    );
    expect(screen.getByText(/Secretary's office sets up your account/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /faculty/i })).toBeNull();
  });

  it.each([
    {
      Page: StaffLandingPage,
      heading: "Staff & Faculty",
      action: "Staff & faculty sign in",
      login: "/login/staff",
      registration: "/register/faculty",
      registerLabel: "Submit a Faculty request",
    },
    {
      Page: ExternalLandingPage,
      heading: "Alumni & Industry Partners",
      action: "Alumni & partner sign in",
      login: "/login/external",
      registration: "/register/external",
      registerLabel: "Create an account",
    },
  ])(
    "$heading landing keeps sign-in and registration within its audience",
    ({ Page, heading, action, login, registration, registerLabel }) => {
      render(<Page />);
      expect(screen.getByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: action })).toHaveAttribute("href", login);
      expect(screen.getByRole("link", { name: registerLabel })).toHaveAttribute(
        "href",
        registration
      );
      const entryLinks = screen
        .getAllByRole("link")
        .filter((link) => /^\/(login|register)\//.test(link.getAttribute("href") ?? ""));
      expect(entryLinks.map((link) => link.getAttribute("href"))).toEqual([login, registration]);
    }
  );

  it("staff entrance offers one Google action for all internal roles", async () => {
    render(await StaffLoginPage());
    expect(screen.getByRole("heading", { level: 1, name: "Staff sign in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue with ACD Google/i })).toBeInTheDocument();
    expect(screen.getByText(/choose a workspace after sign-in/i)).toBeInTheDocument();
    const seal = screen.getByRole("img", { name: "Assumption College of Davao seal" });
    const mark = screen.getByRole("img", { name: "System CLOIE" });
    for (const logo of [seal, mark]) {
      expect(logo.parentElement).toHaveClass("size-16", "sm:size-18", "bg-white", "rounded-full");
    }
    expect(seal).toHaveClass("object-contain");
    expect(mark).toHaveClass("h-[78%]", "w-auto");
  });

  it("faculty registration starts signed-out users with Google before any form", async () => {
    render(await FacultyRegisterPage());
    expect(
      screen.getByRole("heading", { level: 1, name: "Faculty registration" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue with ACD Google/i })).toBeInTheDocument();
    expect(screen.getByText(/grants no Faculty access/i)).toBeInTheDocument();
  });

  it("external entrance is email-first with a Google alternative", async () => {
    render(await ExternalLoginPage({ searchParams: emptyParams }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Alumni & partner sign in" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toHaveClass(
      "h-10",
      "text-sm",
      "pointer-coarse:h-11"
    );
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(
      screen.getByText(
        /I acknowledge that I have read and understood the System CLOIE Privacy Notice/i
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue with Google/i })).toBeInTheDocument();
  });

  it.each([
    { Page: StudentLoginPage, label: "Students", href: "/entry/student" },
    { Page: StaffLoginPage, label: "Staff & Faculty", href: "/entry/staff" },
    { Page: FacultyRegisterPage, label: "Staff & Faculty", href: "/entry/staff" },
    { Page: ExternalRegisterPage, label: "Alumni & Industry Partners", href: "/entry/external" },
  ])(
    "$label entry back navigation returns to its audience landing",
    async ({ Page, label, href }) => {
      render(await Page());
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
      expect(screen.queryByRole("link", { name: "All sign-in options" })).toBeNull();
    }
  );

  it("external login returns to its audience rather than linking staff sign-in", async () => {
    render(await ExternalLoginPage({ searchParams: emptyParams }));
    expect(screen.getByRole("link", { name: "Alumni & Industry Partners" })).toHaveAttribute(
      "href",
      "/entry/external"
    );
    expect(screen.queryByRole("link", { name: /staff sign-in/i })).toBeNull();
  });

  it("external registration collects a name and the Alumni/Industry choice", async () => {
    render(await ExternalRegisterPage());
    expect(
      screen.getByRole("heading", { level: 1, name: "Create an external account" })
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Alumni/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Industry Partner/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("verify-email explains the 6-digit code with resend", async () => {
    render(await VerifyEmailPage({ searchParams: emptyParams }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Verify your email" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("6-digit verification code")).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).not.toHaveAttribute("readonly");
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resend code" })).toBeInTheDocument();
  });

  it("verify-email pins the registered address and drops the repeated acknowledgement", async () => {
    cookieGetMock.mockReturnValue({ value: "amara@example.com" });
    requireLegalMock.mockResolvedValue({ acknowledged: true });

    render(await VerifyEmailPage({ searchParams: emptyParams }));

    const email = screen.getByLabelText("Email address");
    expect(email).toHaveValue("amara@example.com");
    expect(email).toHaveAttribute("readonly");
    expect(screen.getByText(/The code goes to this address/)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.getByRole("button", { name: "Verify email" })).toBeEnabled();
  });

  it("a pinned address outranks the email query parameter", async () => {
    cookieGetMock.mockReturnValue({ value: "amara@example.com" });
    requireLegalMock.mockResolvedValue({ acknowledged: true });

    render(
      await VerifyEmailPage({
        searchParams: Promise.resolve({ email: "someone-else@example.com" }),
      })
    );

    expect(screen.getByLabelText("Email address")).toHaveValue("amara@example.com");
  });

  it("forgot-password stays neutral about account existence", async () => {
    render(await ForgotPasswordPage({ searchParams: emptyParams }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Forgot your password?" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send recovery code" })).toBeInTheDocument();
  });

  it("reset-password confines recovery to a credential change", async () => {
    render(await ResetPasswordPage({ searchParams: emptyParams }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Set a new password" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("6-digit recovery code")).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByText(/never opens a workspace/i)).toBeInTheDocument();
  });
});
