import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const REDIRECT_ERROR = "NEXT_REDIRECT";

const {
  redirectMock,
  resolveAuthSessionMock,
  resolvePostLoginDestinationMock,
  programFindManyMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`${REDIRECT_ERROR}:${path}`);
  }),
  resolveAuthSessionMock: vi.fn(),
  resolvePostLoginDestinationMock: vi.fn(),
  programFindManyMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    program: {
      findMany: programFindManyMock,
    },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/features/auth/services/resolve-post-login-destination", () => ({
  resolvePostLoginDestination: resolvePostLoginDestinationMock,
}));

vi.mock("@/features/users/components/alumni-onboarding-form", () => ({
  AlumniOnboardingForm: ({ email, name }: { email: string; name: string }) => (
    <div data-testid="alumni-form">
      Alumni form for {email} ({name})
    </div>
  ),
}));

vi.mock("@/features/users/components/industry-partner-onboarding-form", () => ({
  IndustryPartnerOnboardingForm: ({ email, name }: { email: string; name: string }) => (
    <div data-testid="industry-form">
      Industry form for {email} ({name})
    </div>
  ),
}));

import OnboardingPage from "@/app/(public)/onboarding/page";

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolvePostLoginDestinationMock.mockReturnValue("/student/dashboard");
    programFindManyMock.mockResolvedValue([]);
  });

  it("redirects when no session resolves", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    await expect(OnboardingPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      `${REDIRECT_ERROR}:/`
    );
    expect(programFindManyMock).not.toHaveBeenCalled();
  });

  it("renders alumni onboarding for the session's own alumni gate", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "user-1",
      email: "alumni@example.com",
      name: "Jamie Cruz",
      roles: ["ALUMNI"],
      activeRole: "ALUMNI",
      profileGate: { status: "ALUMNI_ONBOARDING_REQUIRED", intent: "alumni" },
    });

    const page = await OnboardingPage({ searchParams: Promise.resolve({ intent: "alumni" }) });

    render(page);
    expect(screen.getByTestId("alumni-form")).toHaveTextContent(
      "Alumni form for alumni@example.com (Jamie Cruz)"
    );
  });

  it("renders industry partner onboarding for the session's own industry partner gate", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "user-1",
      email: "partner@example.com",
      name: "Jamie Cruz",
      roles: ["INDUSTRY_PARTNER"],
      activeRole: "INDUSTRY_PARTNER",
      profileGate: { status: "INDUSTRY_PARTNER_ONBOARDING_REQUIRED", intent: "industry-partner" },
    });

    const page = await OnboardingPage({
      searchParams: Promise.resolve({ intent: "industry-partner" }),
    });

    render(page);
    expect(screen.getByTestId("industry-form")).toHaveTextContent(
      "Industry form for partner@example.com (Jamie Cruz)"
    );
  });

  it("refuses a form when the requested intent is not the session's own gate", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "user-1",
      email: "alumni@example.com",
      name: "Jamie Cruz",
      roles: ["ALUMNI"],
      activeRole: "ALUMNI",
      profileGate: { status: "ALUMNI_ONBOARDING_REQUIRED", intent: "alumni" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/alumni/dashboard");

    // An Alumni session must not reach the Industry Partner form by editing the
    // query string: the gate, not the URL, decides which form renders.
    await expect(
      OnboardingPage({ searchParams: Promise.resolve({ intent: "industry-partner" }) })
    ).rejects.toThrow(`${REDIRECT_ERROR}:/alumni/dashboard`);
    expect(programFindManyMock).not.toHaveBeenCalled();
  });

  it("routes an awaiting-placement Student to its guidance status instead of a form", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "user-1",
      email: "student@acd.edu.ph",
      name: "Jamie Cruz",
      roles: ["STUDENT"],
      activeRole: "STUDENT",
      profileGate: { status: "STUDENT_PLACEMENT_REQUIRED" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/status/unprovisioned-student");

    await expect(
      OnboardingPage({ searchParams: Promise.resolve({ intent: "student" }) })
    ).rejects.toThrow(`${REDIRECT_ERROR}:/status/unprovisioned-student`);
    expect(resolvePostLoginDestinationMock).toHaveBeenCalledWith({
      requestedPath: null,
      intent: null,
      activeRole: "STUDENT",
      profileGate: { status: "STUDENT_PLACEMENT_REQUIRED" },
    });
  });

  it("routes an affiliation-less Faculty session to faculty registration, not a form", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "user-1",
      email: "teacher@acd.edu.ph",
      name: "Jamie Cruz",
      roles: ["FACULTY"],
      activeRole: "FACULTY",
      profileGate: { status: "FACULTY_ONBOARDING_REQUIRED", intent: "faculty" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/register/faculty");

    await expect(
      OnboardingPage({ searchParams: Promise.resolve({ intent: "faculty" }) })
    ).rejects.toThrow(`${REDIRECT_ERROR}:/register/faculty`);
    expect(programFindManyMock).not.toHaveBeenCalled();
  });

  it.each([
    ["INACTIVE", "/status/inactive"],
    ["REJECTED_EXTERNAL_ACCOUNT", "/status/rejected"],
    ["AUTH_METHOD_MISMATCH", "/status/method-mismatch"],
    ["FACULTY_APPROVAL_PENDING", "/status/faculty-pending"],
    ["COMPLETE", "/alumni/dashboard"],
  ])("renders no form for the %s verdict", async (status, destination) => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "user-1",
      email: "person@example.com",
      name: "Jamie Cruz",
      roles: ["ALUMNI"],
      activeRole: "ALUMNI",
      profileGate: status === "AUTH_METHOD_MISMATCH" ? { status, role: "ALUMNI" } : { status },
    });
    resolvePostLoginDestinationMock.mockReturnValue(destination);

    await expect(
      OnboardingPage({ searchParams: Promise.resolve({ intent: "alumni" }) })
    ).rejects.toThrow(`${REDIRECT_ERROR}:${destination}`);
    expect(programFindManyMock).not.toHaveBeenCalled();
  });
});
