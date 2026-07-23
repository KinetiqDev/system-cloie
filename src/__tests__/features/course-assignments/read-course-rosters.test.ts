import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseScope, StudentSection, YearLevel } from "@prisma/client";

import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";
import * as authModule from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import {
  getCourseRosterDetail,
  listAuthorizedCourseRosterAssignments,
} from "@/features/course-assignments/services/read-course-rosters";

vi.mock("@/features/auth/services/resolve-auth-session");
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    academicTermInstance: { findFirst: vi.fn() },
    courseAssignment: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn() },
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
  faculty: { first_name: "Ada", last_name: "Lovelace", email: "ada@example.com" },
  term_instance: {
    id: "term-1",
    status: "ACTIVE",
    semester: "FIRST",
    term: "FIRST_TERM",
    school_year: { code: "2026-2027" },
  },
  course_bound_evaluations: [],
} as const;

function eligibleStudent(firstName = "Grace") {
  return {
    is_active: true,
    roles: [{ role: ROLES.STUDENT }],
    student_profile: { program_id: "program-1", student_id_number: "S00001" },
    enrollments: [{ term_instance_id: "term-1", program_id: "program-1" }],
    first_name: firstName,
    last_name: "Hopper",
    email: `${firstName.toLowerCase()}@example.com`,
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

    expect(result).toMatchObject({ success: true, data: { total: 1, includeHistory: false } });
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
        student: { ...eligibleStudent("Inactive"), is_active: false },
      },
    ] as never);

    const result = await listAuthorizedCourseRosterAssignments({ includeHistory: true });

    expect(result).toMatchObject({ success: true, data: { includeHistory: true } });
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
              student_id_number: "S00001",
              major: { name: "Software" },
              program: { code: "BSCS", name: "Computer Science" },
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
            ...eligibleStudent("Ineligible"),
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
});
