import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";

const REDIRECT_ERROR = "NEXT_REDIRECT";

const {
  redirectMock,
  permanentRedirectMock,
  resolveAuthSessionMock,
  loadPageDataMock,
  loadListPageMock,
} =
  vi.hoisted(() => ({
    redirectMock: vi.fn((path: string) => {
      throw new Error(`${REDIRECT_ERROR}:${path}`);
    }),
    permanentRedirectMock: vi.fn((path: string) => {
      throw new Error(`${REDIRECT_ERROR}:${path}`);
    }),
    resolveAuthSessionMock: vi.fn(),
    loadPageDataMock: vi.fn(),
    loadListPageMock: vi.fn(),
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
vi.mock("@/features/course-assignments/services/load-course-assignment-list-page", () => ({
  loadCourseAssignmentListPage: loadListPageMock,
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
    loadPageDataMock.mockResolvedValue({
      availableCourses: [],
      availablePrograms: [],
      availableFaculty: [],
      termInstances: [],
    });
    loadListPageMock.mockResolvedValue({
      state: { page: 1, filters: { isActive: true } },
      initialFilters: {
        termInstanceId: null,
        courseId: null,
        facultyId: null,
        programId: null,
        yearLevel: null,
        section: null,
        isActive: true,
        courseScope: null,
        searchQuery: "",
      },
      result: {
        success: true,
        data: { items: [], total: 0, page: 0, pageSize: 20 },
      },
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

  it("permanently redirects flat route to canonical Academic Structure route", async () => {
    const DeanCourseAssignmentsPage = (await import("../../app/(app)/dean/course-assignments/page"))
      .default;
    expect(() => DeanCourseAssignmentsPage()).toThrow(
      `${REDIRECT_ERROR}:/dean/academic-structure/course-assignments`
    );
  });

  it("renders the authorized initial page using the canonical route state", async () => {
    resolveAuthSessionMock.mockResolvedValue(deanSession());
    loadListPageMock.mockResolvedValueOnce({
      state: { page: 2, filters: { isActive: false, q: "CS101" } },
      initialFilters: {
        termInstanceId: null,
        courseId: null,
        facultyId: null,
        programId: null,
        yearLevel: null,
        section: null,
        isActive: false,
        courseScope: null,
        searchQuery: "CS101",
      },
      result: {
        success: true,
        data: {
          items: [
            {
              id: "assignment-1",
              termInstanceId: "term-1",
              facultyId: "faculty-1",
              courseId: "course-1",
              programId: "program-1",
              yearLevel: "FIRST_YEAR",
              section: "MORNING",
              assignedBy: null,
              isActive: false,
              createdAt: new Date("2026-01-01"),
              updatedAt: new Date("2026-01-01"),
              courseCode: "CS101",
              courseTitle: "Intro to Computing",
              courseScope: "PROGRAM_SPECIFIC",
              facultyName: "Dean Faculty",
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
        },
      },
    });

    const DeanCourseAssignmentsPage = (
      await import("../../app/(app)/dean/academic-structure/course-assignments/page")
    ).default;
    const page = await DeanCourseAssignmentsPage({
      searchParams: Promise.resolve({ page: "2", isActive: "false", q: "CS101" }),
    });

    expect(loadListPageMock).toHaveBeenCalledWith({
      pathname: "/dean/academic-structure/course-assignments",
      rawSearchParams: { page: "2", isActive: "false", q: "CS101" },
      role: "all-program",
    });
    expect(loadPageDataMock).toHaveBeenCalledTimes(1);
    expect(page.props.initialData.items[0].courseCode).toBe("CS101");
    expect(page.props.initialPage).toBe(2);
    expect(page.props.initialError).toBeNull();
  });

  it("keeps canonical route as Dean-only", async () => {
    resolveAuthSessionMock.mockResolvedValue(secretarySession());
    const DeanCourseAssignmentsPage = (
      await import("../../app/(app)/dean/academic-structure/course-assignments/page")
    ).default;

    await expect(
      DeanCourseAssignmentsPage({ searchParams: Promise.resolve({}) })
    ).rejects.toThrow(`${REDIRECT_ERROR}:/unauthorized`);
    expect(loadPageDataMock).not.toHaveBeenCalled();
    expect(loadListPageMock).not.toHaveBeenCalled();
  });

  it("denies a listed Dean whose active role is not Dean", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      ...deanSession(),
      roles: [ROLES.DEAN, ROLES.FACULTY],
      activeRole: ROLES.FACULTY,
    });
    const DeanCourseAssignmentsPage = (
      await import("../../app/(app)/dean/academic-structure/course-assignments/page")
    ).default;

    await expect(
      DeanCourseAssignmentsPage({ searchParams: Promise.resolve({}) })
    ).rejects.toThrow(`${REDIRECT_ERROR}:/unauthorized`);
    expect(loadPageDataMock).not.toHaveBeenCalled();
    expect(loadListPageMock).not.toHaveBeenCalled();
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
