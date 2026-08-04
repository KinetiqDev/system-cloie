import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseScope, YearLevel } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";

const REDIRECT_ERROR = "NEXT_REDIRECT";

const {
  redirectMock,
  resolveAuthSessionMock,
  listProgramHeadCoursesMock,
  listSchoolYearsMock,
  loadListPageMock,
  resolveProgramHeadContextMock,
  loadProgramHeadPageDataMock,
  prismaFindManyMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`${REDIRECT_ERROR}:${path}`);
  }),
  resolveAuthSessionMock: vi.fn(),
  listProgramHeadCoursesMock: vi.fn(),
  listSchoolYearsMock: vi.fn(),
  loadListPageMock: vi.fn(),
  resolveProgramHeadContextMock: vi.fn(),
  loadProgramHeadPageDataMock: vi.fn(),
  prismaFindManyMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/features/academic-structure/services/resolve-program-head-courses", () => ({
  listProgramHeadCourses: listProgramHeadCoursesMock,
}));
vi.mock("@/features/academic-calendar/services/list-school-years", () => ({
  listSchoolYears: listSchoolYearsMock,
}));
vi.mock("@/features/course-assignments/services/load-course-assignment-list-page", () => ({
  loadCourseAssignmentListPage: loadListPageMock,
}));
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));
vi.mock("@/features/course-assignments/services/load-all-program-course-assignments-page", () => ({
  loadProgramHeadCourseAssignmentsPageData: loadProgramHeadPageDataMock,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    facultyProgramAffiliation: { findMany: prismaFindManyMock },
  },
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
  preflightCourseAssignmentDeletionAction: vi.fn(),
}));

describe("Program Head Course Assignments route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({
      userId: "ph-1",
      email: "ph@example.com",
      roles: [ROLES.PROGRAM_HEAD],
      activeRole: ROLES.PROGRAM_HEAD,
      profileGate: { status: "COMPLETE" },
    });
    listProgramHeadCoursesMock.mockResolvedValue({
      courses: [
        {
          id: "course-1",
          code: "CS101",
          title: "Intro to Computing",
          default_year_level: YearLevel.FIRST_YEAR,
          course_scope: CourseScope.PROGRAM_SPECIFIC,
          program_id: "program-1",
        },
      ],
      programs: [{ id: "program-1", code: "BSCS", name: "Computer Science" }],
    });
    listSchoolYearsMock.mockResolvedValue({ items: [{ termInstances: [] }] });
    prismaFindManyMock.mockResolvedValue([]);
    loadListPageMock.mockResolvedValue({
      state: { page: 1, filters: { isActive: undefined } },
      initialFilters: {
        termInstanceId: null,
        courseId: null,
        facultyId: null,
        programId: null,
        yearLevel: null,
        section: null,
        isActive: null,
        courseScope: null,
        searchQuery: "",
      },
      result: { success: true, data: { items: [], total: 0, page: 0, pageSize: 20 } },
    });
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        userId: "ph-1",
        authorizedPrograms: [],
        selectedProgram: { id: "program-1", code: "BSED", name: "BS Education" },
      },
    });
    loadProgramHeadPageDataMock.mockResolvedValue({
      availableCourses: [],
      availablePrograms: [{ id: "program-1", code: "BSED", name: "BS Education" }],
      availableFaculty: [],
      termInstances: [],
    });
  });

  it("loads only the selected canonical Program route", async () => {
    const Page = (await import("../../app/(app)/program-head/programs/[programId]/course-assignments/page")).default;

    await Page({
      params: Promise.resolve({ programId: "program-1" }),
      searchParams: Promise.resolve({ programId: "program-2", q: "faculty" }),
    });

    expect(loadListPageMock).toHaveBeenCalledWith({
      pathname: "/program-head/programs/program-1/course-assignments",
      rawSearchParams: { programId: "program-2", q: "faculty" },
      role: "program-head",
      programId: "program-1",
    });
  });

  it.each(["not-a-uuid", "00000000-0000-4000-8000-000000000000"])(
    "does not load selected data for a malformed or unassigned Program ID (%s)",
    async (programId) => {
      resolveProgramHeadContextMock.mockResolvedValueOnce({
        success: false,
        error: "Selected Program is not assigned.",
      });
      const Page = (await import("../../app/(app)/program-head/programs/[programId]/course-assignments/page")).default;

      await expect(
        Page({ params: Promise.resolve({ programId }), searchParams: Promise.resolve({}) })
      ).rejects.toThrow();
      expect(loadProgramHeadPageDataMock).not.toHaveBeenCalled();
      expect(loadListPageMock).not.toHaveBeenCalled();
    }
  );

  it("redirects the static route to entry without loading assignment data", async () => {
    const CourseAssignmentsPage = (
      await import("../../app/(app)/program-head/course-assignments/page")
    ).default;

    await expect(Promise.resolve().then(() => CourseAssignmentsPage())).rejects.toThrow(
      `${REDIRECT_ERROR}:/program-head`
    );
    expect(listProgramHeadCoursesMock).not.toHaveBeenCalled();
    expect(loadListPageMock).not.toHaveBeenCalled();
  });

  it("does not load any role-owned data for a non-Program Head", async () => {
    resolveAuthSessionMock.mockResolvedValueOnce({
      userId: "dean-1",
      email: "dean@example.com",
      roles: [ROLES.DEAN],
      activeRole: ROLES.DEAN,
      profileGate: { status: "COMPLETE" },
    });
    const CourseAssignmentsPage = (
      await import("../../app/(app)/program-head/course-assignments/page")
    ).default;

    await expect(Promise.resolve().then(() => CourseAssignmentsPage())).rejects.toThrow(
      `${REDIRECT_ERROR}:/program-head`
    );
    expect(listProgramHeadCoursesMock).not.toHaveBeenCalled();
    expect(loadListPageMock).not.toHaveBeenCalled();
  });
});
