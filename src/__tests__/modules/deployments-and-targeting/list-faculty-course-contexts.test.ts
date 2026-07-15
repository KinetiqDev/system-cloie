import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROLES } from "@/lib/constants/roles";
import { listFacultyCourseContexts } from "@/features/evaluations/services/list-faculty-course-contexts";

const { affiliationFindManyMock, courseAssignmentFindManyMock, courseFindManyMock, resolveAuthSessionMock } = vi.hoisted(() => ({
  affiliationFindManyMock: vi.fn(),
  courseAssignmentFindManyMock: vi.fn(),
  courseFindManyMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    facultyProgramAffiliation: {
      findMany: affiliationFindManyMock,
    },
    courseAssignment: {
      findMany: courseAssignmentFindManyMock,
    },
    course: {
      findMany: courseFindManyMock,
    },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

describe("listFacultyCourseContexts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns no contexts when the signed-in user is not faculty", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.STUDENT,
      roles: [ROLES.STUDENT],
      userId: "student-1",
    });

    await expect(listFacultyCourseContexts()).resolves.toEqual({
      success: false,
      error: "Faculty authentication is required.",
    });
    expect(affiliationFindManyMock).not.toHaveBeenCalled();
    expect(courseFindManyMock).not.toHaveBeenCalled();
  });

  it("lists active course contexts within the faculty member's affiliated programs", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
      userId: "faculty-1",
    });
    // New service: gets course IDs from assignments (all-term fallback)
    courseAssignmentFindManyMock.mockResolvedValue([
      { course_id: "course-1" },
      { course_id: "course-2" },
    ]);
    courseFindManyMock.mockResolvedValue([
      {
        code: "IT-401",
        course_scope: "PROGRAM_SPECIFIC",
        id: "course-1",
        major: null,
        major_id: null,
        program: {
          code: "BSIT",
          id: "program-1",
          name: "Bachelor of Science in Information Technology",
        },
        program_id: "program-1",
        title: "Capstone 1",
      },
      {
        code: "GE-101",
        course_scope: "GENERAL_EDUCATION",
        id: "course-2",
        major: null,
        major_id: null,
        program: null,
        program_id: null,
        title: "General Education Foundations",
      },
    ]);

    await expect(listFacultyCourseContexts()).resolves.toEqual({
      success: true,
      data: [
        {
          courseCode: "IT-401",
          courseId: "course-1",
          courseTitle: "Capstone 1",
          courseType: "PROGRAM_SPECIFIC",
          majorId: null,
          majorName: null,
          programCode: "BSIT",
          programId: "program-1",
          programName: "Bachelor of Science in Information Technology",
          scopeLabel: "BSIT - Shared Program Course",
        },
        {
          courseCode: "GE-101",
          courseId: "course-2",
          courseTitle: "General Education Foundations",
          courseType: "GENERAL_EDUCATION",
          majorId: null,
          majorName: null,
          programCode: "",
          programId: "",
          programName: "",
          scopeLabel: " - General Education",
        },
      ],
    });

    expect(affiliationFindManyMock).not.toHaveBeenCalled();
    expect(courseAssignmentFindManyMock).toHaveBeenCalledWith({
      where: {
        faculty_id: "faculty-1",
        is_active: true,
        term_instance: { status: "ACTIVE" },
      },
      select: { course_id: true },
      distinct: ["course_id"],
    });
    expect(courseFindManyMock).toHaveBeenCalledWith({
      where: {
        id: { in: ["course-1", "course-2"] },
        is_active: true,
      },
      include: {
        major: true,
        program: true,
      },
      orderBy: [{ course_scope: "asc" }, { code: "asc" }],
    });
  });

  it("lists course contexts from course assignments when termInstanceId is provided", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
      userId: "faculty-1",
    });

    courseAssignmentFindManyMock.mockResolvedValue([
      { course_id: "course-1" },
      { course_id: "course-2" },
    ]);

    courseFindManyMock.mockResolvedValue([
      {
        code: "CS-101",
        course_scope: "PROGRAM_SPECIFIC",
        id: "course-1",
        major: null,
        major_id: null,
        program: {
          code: "BSCS",
          id: "program-1",
          name: "Computer Science",
        },
        program_id: "program-1",
        title: "Intro to CS",
      },
      {
        code: "CS-201",
        course_scope: "PROGRAM_SPECIFIC",
        id: "course-2",
        major: null,
        major_id: null,
        program: {
          code: "BSCS",
          id: "program-1",
          name: "Computer Science",
        },
        program_id: "program-1",
        title: "Data Structures",
      },
    ]);

    await expect(listFacultyCourseContexts("term-instance-1")).resolves.toEqual({
      success: true,
      data: [
        {
          courseCode: "CS-101",
          courseId: "course-1",
          courseTitle: "Intro to CS",
          courseType: "PROGRAM_SPECIFIC",
          majorId: null,
          majorName: null,
          programCode: "BSCS",
          programId: "program-1",
          programName: "Computer Science",
          scopeLabel: "BSCS - Shared Program Course",
        },
        {
          courseCode: "CS-201",
          courseId: "course-2",
          courseTitle: "Data Structures",
          courseType: "PROGRAM_SPECIFIC",
          majorId: null,
          majorName: null,
          programCode: "BSCS",
          programId: "program-1",
          programName: "Computer Science",
          scopeLabel: "BSCS - Shared Program Course",
        },
      ],
    });

    // Should call courseAssignment, not facultyProgramAffiliation
    expect(courseAssignmentFindManyMock).toHaveBeenCalledWith({
      where: {
        faculty_id: "faculty-1",
        term_instance_id: "term-instance-1",
        is_active: true,
        term_instance: { status: "ACTIVE" },
      },
      select: { course_id: true },
    });
    expect(affiliationFindManyMock).not.toHaveBeenCalled();

    expect(courseFindManyMock).toHaveBeenCalledWith({
      where: {
        id: { in: ["course-1", "course-2"] },
        is_active: true,
      },
      include: {
        major: true,
        program: true,
      },
      orderBy: [{ course_scope: "asc" }, { code: "asc" }],
    });
  });

  it("returns empty array when no course assignments found for term", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
      userId: "faculty-1",
    });

    courseAssignmentFindManyMock.mockResolvedValue([]);

    await expect(listFacultyCourseContexts("term-with-no-assignments")).resolves.toEqual({
      success: true,
      data: [],
    });
    expect(courseAssignmentFindManyMock).toHaveBeenCalled();
    expect(courseFindManyMock).not.toHaveBeenCalled();
  });
});
