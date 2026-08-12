import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const REDIRECT_ERROR = "NEXT_REDIRECT";

const {
  redirectMock,
  getUserMock,
  resolveAuthSessionMock,
  resolveAuthSessionFromUserMock,
  resolvePostLoginDestinationMock,
  programFindManyMock,
  yearLevelFindManyMock,
  getActiveTermIdMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`${REDIRECT_ERROR}:${path}`);
  }),
  getUserMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
  resolveAuthSessionFromUserMock: vi.fn(),
  resolvePostLoginDestinationMock: vi.fn(),
  programFindManyMock: vi.fn(),
  yearLevelFindManyMock: vi.fn(),
  getActiveTermIdMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: getUserMock,
    },
  })),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    program: {
      findMany: programFindManyMock,
    },
    yearLevel: {
      findMany: yearLevelFindManyMock,
    },
  },
}));

vi.mock("@/features/academic-calendar/services/resolve-active-term", () => ({
  getActiveTermId: getActiveTermIdMock,
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
  resolveAuthSessionFromUser: resolveAuthSessionFromUserMock,
}));

vi.mock("@/features/auth/services/resolve-post-login-destination", () => ({
  resolvePostLoginDestination: resolvePostLoginDestinationMock,
}));

vi.mock("@/app/(public)/onboarding/student-profile-form", () => ({
  StudentProfileForm: ({ email }: { email: string }) => <div>Student form for {email}</div>,
}));

vi.mock("@/features/users/components/alumni-onboarding-form", () => ({
  AlumniOnboardingForm: ({ email }: { email: string }) => (
    <div data-testid="alumni-form">Alumni form for {email}</div>
  ),
}));

vi.mock("@/features/users/components/industry-partner-onboarding-form", () => ({
  IndustryPartnerOnboardingForm: ({ email }: { email: string }) => (
    <div data-testid="industry-form">Industry form for {email}</div>
  ),
}));

vi.mock("@/features/users/components/faculty-onboarding-form", () => ({
  FacultyOnboardingForm: ({ email }: { email: string }) => (
    <div data-testid="faculty-form">Faculty form for {email}</div>
  ),
}));

import OnboardingPage from "@/app/(public)/onboarding/page";

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "student@acd.edu.ph",
          user_metadata: { full_name: "Jamie Cruz" },
        },
      },
      error: null,
    });
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: null,
      profileGate: { status: "ROLE_SELECTION_REQUIRED" },
    });
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: null,
      profileGate: { status: "ROLE_SELECTION_REQUIRED" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/student/dashboard");
    programFindManyMock.mockResolvedValue([]);
    yearLevelFindManyMock.mockResolvedValue([]);
    getActiveTermIdMock.mockResolvedValue("term-uuid-123");
  });

  it("redirects unauthenticated requests to login", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: new Error("auth failed"),
    });

    await expect(OnboardingPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      `${REDIRECT_ERROR}:/portal/respondents`
    );
  });

  it("redirects complete users through resolvePostLoginDestination", async () => {
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: "STUDENT",
      profileGate: { status: "COMPLETE" },
    });

    await expect(OnboardingPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      `${REDIRECT_ERROR}:/student/dashboard`
    );
    expect(resolvePostLoginDestinationMock).toHaveBeenCalledWith({
      requestedPath: "/dashboard",
      intent: null,
      activeRole: "STUDENT",
      profileGate: { status: "COMPLETE" },
    });
    expect(resolveAuthSessionFromUserMock).toHaveBeenCalledWith({
      id: "user-1",
      email: "student@acd.edu.ph",
    });
    expect(resolveAuthSessionMock).not.toHaveBeenCalled();
  });

  it("renders the student form path for incomplete users with intent=student", async () => {
    const page = await OnboardingPage({
      searchParams: Promise.resolve({ intent: "student", step: "form" }),
    });

    render(page);
    expect(screen.getByText("Student form for student@acd.edu.ph")).toBeInTheDocument();
    expect(resolveAuthSessionFromUserMock).toHaveBeenCalledWith({
      id: "user-1",
      email: "student@acd.edu.ph",
    });
  });

  it("renders alumni onboarding without name fallback props", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "alumni@example.com",
          user_metadata: { full_name: "Alumni Member", given_name: "Alumni", family_name: "Member" },
        },
      },
      error: null,
    });

    const page = await OnboardingPage({
      searchParams: Promise.resolve({ intent: "alumni" }),
    });

    render(page);
    expect(screen.getByTestId("alumni-form")).toHaveTextContent("Alumni form for alumni@example.com");
  });

  it("renders faculty onboarding without name fallback props", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "teacher@acd.edu.ph",
        },
      },
      error: null,
    });

    const page = await OnboardingPage({
      searchParams: Promise.resolve({ intent: "faculty" }),
    });

    render(page);
    expect(screen.getByTestId("faculty-form")).toHaveTextContent(
      "Faculty form for teacher@acd.edu.ph"
    );
  });
});
