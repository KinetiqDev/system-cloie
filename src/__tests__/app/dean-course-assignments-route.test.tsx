import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ROLES } from "@/lib/constants/roles";

const REDIRECT_ERROR = "NEXT_REDIRECT";

const {
  redirectMock,
  resolveAuthSessionMock,
  loadPageDataMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`${REDIRECT_ERROR}:${path}`);
  }),
  resolveAuthSessionMock: vi.fn(),
  loadPageDataMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/features/course-assignments/services/load-all-program-course-assignments-page", () => ({
  loadAllProgramCourseAssignmentsPageData: loadPageDataMock,
}));

describe("Dean Course Assignments route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadPageDataMock.mockResolvedValue({
      availableCourses: [],
      availablePrograms: [],
      availableFaculty: [],
      termInstances: [],
    });
  });

  function deanSession() {
    return {
      userId: "dean-1",
      email: "dean@example.com",
      roles: [ROLES.DEAN],
      activeRole: ROLES.DEAN,
      profileGate: { status: "COMPLETE" },
    };
  }

  function secretarySession() {
    return {
      userId: "secretary-1",
      email: "secretary@example.com",
      roles: [ROLES.SECRETARY],
      activeRole: ROLES.SECRETARY,
      profileGate: { status: "COMPLETE" },
    };
  }

  it("exports Dean-specific metadata", async () => {
    const { metadata } = await import("../../app/(app)/dean/course-assignments/page");
    expect(metadata.title).toBe("Course Assignments — Dean | CLOIE");
  });

  it("renders the shared all-program shell for a Dean user", async () => {
    resolveAuthSessionMock.mockResolvedValue(deanSession());

    const DeanCourseAssignmentsPage = (await import("../../app/(app)/dean/course-assignments/page"))
      .default;
    const page = await DeanCourseAssignmentsPage();

    render(page);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /course assignments/i })).toBeInTheDocument();
    });
    expect(
      screen.getByText(/manage faculty assignments across all programs, including general education courses/i)
    ).toBeInTheDocument();
  });

  it("redirects Secretary users to /unauthorized on the Dean route", async () => {
    resolveAuthSessionMock.mockResolvedValue(secretarySession());

    const DeanCourseAssignmentsPage = (await import("../../app/(app)/dean/course-assignments/page"))
      .default;

    await expect(DeanCourseAssignmentsPage()).rejects.toThrow(`${REDIRECT_ERROR}:/unauthorized`);
  });

  it("redirects unauthenticated users to /unauthorized on the Dean route", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    const DeanCourseAssignmentsPage = (await import("../../app/(app)/dean/course-assignments/page"))
      .default;

    await expect(DeanCourseAssignmentsPage()).rejects.toThrow(`${REDIRECT_ERROR}:/unauthorized`);
  });
});

describe("Secretary Course Assignments route cross-role denial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadPageDataMock.mockResolvedValue({
      availableCourses: [],
      availablePrograms: [],
      availableFaculty: [],
      termInstances: [],
    });
  });

  it("redirects Dean users to /unauthorized on the Secretary route", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "dean-1",
      email: "dean@example.com",
      roles: [ROLES.DEAN],
      activeRole: ROLES.DEAN,
      profileGate: { status: "COMPLETE" },
    });

    const SecretaryCourseAssignmentsPage = (
      await import("../../app/(app)/secretary/course-assignments/page")
    ).default;

    await expect(SecretaryCourseAssignmentsPage()).rejects.toThrow(`${REDIRECT_ERROR}:/unauthorized`);
  });
});
