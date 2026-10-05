import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseScope, StudentSection, YearLevel } from "@prisma/client";

import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";
import * as authModule from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import {
  getCourseRosterDetail,
  listAuthorizedCourseRosterAssignments,
  listFacultyRosterFacets,
} from "@/features/course-assignments/services/read-course-rosters";

vi.mock("@/features/auth/services/resolve-auth-session");
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    academicTermInstance: { findFirst: vi.fn() },
    courseAssignment: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn() },
    program: { findMany: vi.fn() },
    courseAssignmentMembership: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    programHeadAssignment: { findMany: vi.fn() },
  },
}));

const assignment = {
  id: "assignment-1",
  faculty_id: "faculty-1",
  course_id: "course-1",
  program_id: "program-1",
  year_level: YearLevel.SECOND_YEAR,
  section: StudentSection.MORNING,
  is_active: true,
  course: { code: "CS101", title: "Computing", course_scope: CourseScope.PROGRAM_SPECIFIC },
  program: { code: "BSCS", name: "Computer Science" },
  faculty: { name: "Ada Lovelace", email: "ada@example.com" },
  term_instance: {
    id: "term-1",
    status: "ACTIVE",
    semester: "FIRST",
    term: "FIRST_TERM",
    school_year: { code: "2026-2027" },
  },
  course_bound_evaluations: [],
} as const;

function eligibleStudent(name = "Grace Hopper") {
  return {
    is_active: true,
    roles: [{ role: ROLES.STUDENT }],
    student_profile: {
      program_id: "program-1",
      major_id: null,
      program: { is_active: true, majors: [] },
      major: null,
    },
    enrollments: [{ term_instance_id: "term-1", program_id: "program-1" }],
    name,
    email: `${name.split(" ")[0].toLowerCase()}@example.com`,
  };
}

describe("read course rosters", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.academicTermInstance.findFirst).mockResolvedValue({ id: "term-1" } as never);
    vi.mocked(prisma.programHeadAssignment.findMany).mockResolvedValue([] as never);
  });

  it("limits Faculty discovery to owned current-period assignments by default", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "faculty-1", roles: [ROLES.FACULTY] })
    );
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([assignment] as never);
    vi.mocked(prisma.courseAssignment.count).mockResolvedValue(1);
    vi.mocked(prisma.courseAssignmentMembership.findMany).mockResolvedValue([] as never);

    const result = await listAuthorizedCourseRosterAssignments({ facultyOnly: true });

    expect(result).toMatchObject({
      success: true,
      data: { total: 1, period: { mode: "current" } },
    });
    expect(prisma.courseAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              faculty_id: "faculty-1",
              is_active: true,
              term_instance_id: "term-1",
            }),
          ]),
        }),
      })
    );
  });

  it("allows Secretary discovery to include history and keeps counts eligibility-specific", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "secretary-1", roles: [ROLES.SECRETARY] })
    );
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([assignment] as never);
    vi.mocked(prisma.courseAssignment.count).mockResolvedValue(1);
    vi.mocked(prisma.courseAssignmentMembership.findMany).mockResolvedValue([
      {
        course_assignment_id: "assignment-1",
        id: "membership-1",
        student_user_id: "student-1",
        is_active: true,
        created_at: new Date(),
        removed_at: null,
        remover: null,
        student: eligibleStudent(),
      },
      {
        course_assignment_id: "assignment-1",
        id: "membership-2",
        student_user_id: "student-2",
        is_active: true,
        created_at: new Date(),
        removed_at: null,
        remover: null,
        student: { ...eligibleStudent("Inactive Student"), is_active: false },
      },
    ] as never);

    const result = await listAuthorizedCourseRosterAssignments({ period: { mode: "all" } });

    expect(result).toMatchObject({ success: true, data: { period: { mode: "all" } } });
    expect(result.success && result.data.items[0]).toMatchObject({
      activeRosterCount: 2,
      evaluationEligibleCount: 1,
    });
    expect(prisma.courseAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.not.objectContaining({ is_active: true }) })
    );
  });

  it("returns the same not-found result for missing and unauthorized detail IDs", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "faculty-2", roles: [ROLES.FACULTY] })
    );
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.courseAssignment.findUnique)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce(assignment as never);

    const missing = await getCourseRosterDetail("missing");
    const unauthorized = await getCourseRosterDetail("assignment-1");

    expect(missing).toEqual({ success: false, error: "Course assignment not found." });
    expect(unauthorized).toEqual(missing);
  });

  it("uses separate active and eligible counts and exposes name/email detail controls", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "secretary-1", roles: [ROLES.SECRETARY] })
    );
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue(assignment as never);
    vi.mocked(prisma.courseAssignmentMembership.count)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);
    vi.mocked(prisma.courseAssignmentMembership.findMany)
      .mockResolvedValueOnce([
        {
          id: "membership-1",
          student_user_id: "student-1",
          is_active: true,
          created_at: new Date("2026-07-01T00:00:00Z"),
          removed_at: null,
          remover: null,
          student: {
            ...eligibleStudent(),
            student_profile: {
              program_id: "program-1",
              major_id: null,
              major: { name: "Software", is_active: true, program_id: "program-1" },
              program: {
                code: "BSCS",
                name: "Computer Science",
                is_active: true,
                majors: [],
              },
            },
            enrollments: [
              {
                term_instance_id: "term-1",
                program_id: "program-1",
                major: { name: "Software" },
                program: { code: "BSCS", name: "Computer Science" },
              },
            ],
          },
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          student: {
            ...eligibleStudent(),
            enrollments: [{ term_instance_id: "term-1", program_id: "program-1" }],
          },
        },
        {
          student: {
            ...eligibleStudent("Ineligible Student"),
            is_active: false,
            enrollments: [{ term_instance_id: "term-1", program_id: "program-1" }],
          },
        },
      ] as never);

    const result = await getCourseRosterDetail("assignment-1", {
      search: "grace@example.com",
      includeRemoved: true,
      sortDirection: "desc",
    });

    expect(result).toMatchObject({
      success: true,
      data: {
        totalMembers: 1,
        activeRosterCount: 2,
        evaluationEligibleCount: 1,
        search: "grace@example.com",
        includeRemoved: true,
        sortDirection: "desc",
      },
    });
    expect(prisma.courseAssignmentMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: expect.any(Array) })
    );
  });

  it("returns roster detail for an assignment on an inactive course", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "secretary-1", roles: [ROLES.SECRETARY] })
    );
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
      ...assignment,
      course: { ...assignment.course, is_active: false },
    } as never);
    vi.mocked(prisma.courseAssignmentMembership.count).mockResolvedValue(0);
    vi.mocked(prisma.courseAssignmentMembership.findMany).mockResolvedValue([] as never);

    const result = await getCourseRosterDetail("assignment-1");

    expect(result).toMatchObject({
      success: true,
      data: { totalMembers: 0, activeRosterCount: 0, evaluationEligibleCount: 0 },
    });
    expect(prisma.courseAssignment.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "assignment-1" } })
    );
  });

  it("rejects a cross-Program detail request without disclosing assignment data", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "head-1", roles: [ROLES.PROGRAM_HEAD] })
    );
    const { resolveProgramHeadContext } =
      await import("@/features/auth/services/resolve-program-head-context");
    vi.mocked(resolveProgramHeadContext).mockResolvedValue({
      success: true,
      data: {
        userId: "head-1",
        authorizedPrograms: [],
        selectedProgram: { id: "program-1", code: "BSED", name: "Education" },
      },
    });
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
      ...assignment,
      program_id: "program-2",
    } as never);

    await expect(
      getCourseRosterDetail("assignment-1", { programId: "program-1" })
    ).resolves.toEqual({
      success: false,
      error: "Course assignment not found.",
    });
  });

  it("rejects an unauthorized selected Program in roster discovery", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "head-1", roles: [ROLES.PROGRAM_HEAD] })
    );
    const { resolveProgramHeadContext } =
      await import("@/features/auth/services/resolve-program-head-context");
    vi.mocked(resolveProgramHeadContext).mockResolvedValue({
      success: false,
      error: "Selected Program is not assigned.",
    });

    await expect(
      listAuthorizedCourseRosterAssignments({ scopedProgramId: "program-2" })
    ).resolves.toEqual({ success: false, error: "Course assignment not found." });
    const { prisma } = await import("@/lib/db/prisma");
    expect(prisma.courseAssignment.findMany).not.toHaveBeenCalled();
  });

  it("requires selected Program scope for Program Head roster discovery", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "head-1", roles: [ROLES.PROGRAM_HEAD] })
    );

    await expect(listAuthorizedCourseRosterAssignments()).resolves.toEqual({
      success: false,
      error: "Course assignment not found.",
    });
    const { prisma } = await import("@/lib/db/prisma");
    expect(prisma.courseAssignment.findMany).not.toHaveBeenCalled();
  });

  it("cannot replace Program Head authorization with a Program filter", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "head-1", roles: [ROLES.PROGRAM_HEAD] })
    );
    const { resolveProgramHeadContext } =
      await import("@/features/auth/services/resolve-program-head-context");
    vi.mocked(resolveProgramHeadContext).mockResolvedValue({
      success: true,
      data: {
        userId: "head-1",
        authorizedPrograms: [],
        selectedProgram: { id: "program-1", code: "BSED", name: "Education" },
      },
    });
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.courseAssignment.count).mockResolvedValue(0);

    await listAuthorizedCourseRosterAssignments({
      scopedProgramId: "program-1",
      programId: "program-2",
    });

    const [{ where }] = vi.mocked(prisma.courseAssignment.findMany).mock.calls[0] as [
      { where: { AND: Record<string, unknown>[] } },
    ];
    expect(where.AND).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ program_id: { in: ["program-1"] } }),
        expect.objectContaining({ program_id: "program-2" }),
      ])
    );
    expect(prisma.courseAssignment.count).toHaveBeenCalledWith({ where });
  });

  it("reads a selected Academic Period whatever its lifecycle", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "faculty-1", roles: [ROLES.FACULTY] })
    );
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.courseAssignment.count).mockResolvedValue(0);

    await listAuthorizedCourseRosterAssignments({
      period: { mode: "term", termInstanceId: "term-9" },
    });

    expect(prisma.courseAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              faculty_id: "faculty-1",
              term_instance_id: "term-9",
            }),
          ]),
        }),
      })
    );
    // A specific period is not restricted to active assignments.
    const [{ where }] = vi.mocked(prisma.courseAssignment.findMany).mock.calls[0] as [
      { where: { AND: Record<string, unknown>[] } },
    ];
    expect(where.AND[0]).not.toHaveProperty("is_active");
  });

  it("returns nothing for the active scope when no Academic Period is active", async () => {
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.academicTermInstance.findFirst).mockResolvedValue(null as never);
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "faculty-1", roles: [ROLES.FACULTY] })
    );
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.courseAssignment.count).mockResolvedValue(0);

    const result = await listAuthorizedCourseRosterAssignments();

    expect(result).toMatchObject({ success: true, data: { activePeriodId: null } });
    const [{ where }] = vi.mocked(prisma.courseAssignment.findMany).mock.calls[0] as [
      { where: { AND: Record<string, unknown>[] } },
    ];
    expect(where.AND[0]).toMatchObject({ is_active: true, id: { in: [] } });
  });

  it("applies every narrowing facet alongside the Faculty scope", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "faculty-1", roles: [ROLES.FACULTY] })
    );
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.courseAssignment.count).mockResolvedValue(0);

    await listAuthorizedCourseRosterAssignments({
      courseId: "course-2",
      programId: "program-2",
      yearLevel: YearLevel.THIRD_YEAR,
      section: StudentSection.EVENING,
      courseScope: CourseScope.GENERAL_EDUCATION,
    });

    const [{ where }] = vi.mocked(prisma.courseAssignment.findMany).mock.calls[0] as [
      { where: { AND: Record<string, unknown>[] } },
    ];
    expect(where.AND[0]).toMatchObject({ faculty_id: "faculty-1" });
    expect(where.AND[1]).toMatchObject({
      course_id: "course-2",
      program_id: "program-2",
      year_level: YearLevel.THIRD_YEAR,
      section: StudentSection.EVENING,
      course: { course_scope: CourseScope.GENERAL_EDUCATION },
    });
  });

  it("keeps a search term set as its own AND clause", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "faculty-1", roles: [ROLES.FACULTY] })
    );
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.courseAssignment.count).mockResolvedValue(0);

    await listAuthorizedCourseRosterAssignments({ search: "ges tech" });

    const [{ where }] = vi.mocked(prisma.courseAssignment.findMany).mock.calls[0] as [
      { where: { AND: unknown[] } },
    ];
    expect(where.AND).toHaveLength(4);
  });
});

describe("Faculty roster facets", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.academicTermInstance.findFirst).mockResolvedValue({ id: "term-1" } as never);
  });

  it("offers only the Courses and Programs the Faculty member is assigned in", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "faculty-1", roles: [ROLES.FACULTY] })
    );
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([
      {
        course: {
          id: "course-2",
          code: "IT201",
          title: "Data Structures",
          course_scope: CourseScope.PROGRAM_SPECIFIC,
        },
        program: { id: "program-2", code: "BSIT", name: "Information Technology" },
      },
      {
        course: {
          id: "course-1",
          code: "GESTECH",
          title: "Society",
          course_scope: CourseScope.GENERAL_EDUCATION,
        },
        program: { id: "program-1", code: "BSBA", name: "Business Administration" },
      },
    ] as never);

    const result = await listFacultyRosterFacets();

    expect(result).toEqual({
      success: true,
      data: {
        courses: [
          {
            id: "course-1",
            code: "GESTECH",
            title: "Society",
            courseScope: CourseScope.GENERAL_EDUCATION,
          },
          {
            id: "course-2",
            code: "IT201",
            title: "Data Structures",
            courseScope: CourseScope.PROGRAM_SPECIFIC,
          },
        ],
        programs: [
          { id: "program-1", code: "BSBA", name: "Business Administration" },
          { id: "program-2", code: "BSIT", name: "Information Technology" },
        ],
      },
    });
    expect(prisma.courseAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { faculty_id: "faculty-1" },
        distinct: ["course_id", "program_id"],
      })
    );
  });

  it("offers a Course once when it spans several of the Faculty member's Programs", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "faculty-1", roles: [ROLES.FACULTY] })
    );
    const { prisma } = await import("@/lib/db/prisma");
    // distinct is on the (course, program) pair, so one shared Course across
    // two Programs arrives as two rows carrying the same Course.
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([
      {
        course: {
          id: "course-1",
          code: "GESTECH",
          title: "Society",
          course_scope: CourseScope.GENERAL_EDUCATION,
        },
        program: { id: "program-1", code: "BSBA", name: "Business Administration" },
      },
      {
        course: {
          id: "course-1",
          code: "GESTECH",
          title: "Society",
          course_scope: CourseScope.GENERAL_EDUCATION,
        },
        program: { id: "program-2", code: "BSIT", name: "Information Technology" },
      },
    ] as never);

    const result = await listFacultyRosterFacets();

    expect(result.success && result.data.courses.map((course) => course.id)).toEqual(["course-1"]);
    expect(result.success && result.data.programs.map((program) => program.id)).toEqual([
      "program-1",
      "program-2",
    ]);
  });

  it("offers a Program once when it holds several of the Faculty member's Courses", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "faculty-1", roles: [ROLES.FACULTY] })
    );
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([
      {
        course: {
          id: "course-1",
          code: "GESTECH",
          title: "Society",
          course_scope: CourseScope.GENERAL_EDUCATION,
        },
        program: { id: "program-1", code: "BSBA", name: "Business Administration" },
      },
      {
        course: {
          id: "course-2",
          code: "IT201",
          title: "Data Structures",
          course_scope: CourseScope.PROGRAM_SPECIFIC,
        },
        program: { id: "program-1", code: "BSBA", name: "Business Administration" },
      },
    ] as never);

    const result = await listFacultyRosterFacets();

    expect(result.success && result.data.programs.map((program) => program.id)).toEqual([
      "program-1",
    ]);
    expect(result.success && result.data.courses.map((course) => course.id)).toEqual([
      "course-1",
      "course-2",
    ]);
  });

  it("refuses facets for a session that is not a Faculty member", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "dean-1", roles: [ROLES.DEAN] })
    );

    await expect(listFacultyRosterFacets()).resolves.toEqual({
      success: false,
      error: "Course assignment not found.",
    });
    const { prisma } = await import("@/lib/db/prisma");
    expect(prisma.courseAssignment.findMany).not.toHaveBeenCalled();
  });

  it("requires a resolved session", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(null);

    await expect(listFacultyRosterFacets()).resolves.toEqual({
      success: false,
      error: "Authentication required.",
    });
  });

  it("keeps an unexpected facet failure opaque", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "faculty-1", roles: [ROLES.FACULTY] })
    );
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.courseAssignment.findMany).mockRejectedValue(new Error("connection reset"));

    const result = await listFacultyRosterFacets();

    expect(result).toMatchObject({
      success: false,
      error: "The roster request could not be completed.",
    });
    expect(result.success === false && result.referenceId).toEqual(expect.any(String));
  });
});
