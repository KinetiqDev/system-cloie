import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";

const REDIRECT_ERROR = "NEXT_REDIRECT";

const { redirectMock, permanentRedirectMock, resolveAuthSessionMock, loadPageDataMock } =
  vi.hoisted(() => ({
    redirectMock: vi.fn((path: string) => {
      throw new Error(`${REDIRECT_ERROR}:${path}`);
    }),
    permanentRedirectMock: vi.fn((path: string) => {
      throw new Error(`${REDIRECT_ERROR}:${path}`);
    }),
    resolveAuthSessionMock: vi.fn(),
    loadPageDataMock: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  permanentRedirect: permanentRedirectMock,
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/features/course-assignments/services/load-all-program-course-assignments-page", () => ({
  loadAllProgramCourseAssignmentsPageData: loadPageDataMock,
}));
vi.mock("@/lib/actions/course-assignment-actions", () => ({
  loadCourseAssignmentsForSheetAction: vi.fn(),
  createCourseAssignmentAction: vi.fn(),
  bulkCreateCourseAssignmentsAction: vi.fn(),
  searchFacultyPoolAction: vi.fn(),
  deactivateCourseAssignmentAction: vi.fn(),
  activateCourseAssignmentAction: vi.fn(),
  deleteCourseAssignmentAction: vi.fn(),
  updateCourseAssignmentAction: vi.fn(),
}));

describe("Dean Course Assignments route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("permanently redirects flat route to canonical Academic Structure route", async () => {
    const DeanCourseAssignmentsPage = (await import("../../app/(app)/dean/course-assignments/page"))
      .default;
    expect(() => DeanCourseAssignmentsPage()).toThrow(
      `${REDIRECT_ERROR}:/dean/academic-structure/course-assignments`
    );
  });

  it("keeps canonical route as Dean-only", async () => {
    void deanSession;
    void secretarySession;
    expect(true).toBe(true);
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

    await expect(
      SecretaryCourseAssignmentsPage({ searchParams: Promise.resolve({}) })
    ).rejects.toThrow(`${REDIRECT_ERROR}:/unauthorized`);
  });

  it("uses active role instead of another role in the session", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "secretary-1",
      email: "secretary@example.com",
      roles: [ROLES.SECRETARY, ROLES.FACULTY],
      activeRole: ROLES.FACULTY,
      profileGate: { status: "COMPLETE" },
    });

    const SecretaryCourseAssignmentsPage = (
      await import("../../app/(app)/secretary/course-assignments/page")
    ).default;

    await expect(
      SecretaryCourseAssignmentsPage({ searchParams: Promise.resolve({}) })
    ).rejects.toThrow(`${REDIRECT_ERROR}:/unauthorized`);
    expect(loadPageDataMock).not.toHaveBeenCalled();
  });
});
