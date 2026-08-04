import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseScope } from "@prisma/client";

import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";
import { ROLES } from "@/lib/constants/roles";
import * as authModule from "@/features/auth/services/resolve-auth-session";
import {
  projectCourseBoundEvaluationEligibility,
  projectRosterEligibility,
  resolveAuthorizedCourseAssignmentRoster,
  resolveCurrentRosterEligibility,
} from "@/features/course-assignments/services/course-assignment-roster";

vi.mock("@/features/auth/services/resolve-auth-session");
  vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    courseAssignment: { findUnique: vi.fn() },
    evaluationAssignment: { findMany: vi.fn() },
    courseAssignmentMembership: { findMany: vi.fn(), findUnique: vi.fn() },
    programHeadAssignment: { findMany: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: vi.fn(),
}));

describe("course-assignment-roster service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the same not-found result for missing and unauthorized assignment details", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "faculty-2", roles: [ROLES.FACULTY] })
    );
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.courseAssignmentMembership.findUnique).mockResolvedValue({
      id: "membership-1",
      is_active: true,
    } as never);
    vi.mocked(prisma.courseAssignment.findUnique)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({
        id: "assignment-1",
        faculty_id: "faculty-1",
        course_id: "course-1",
        program_id: "program-1",
        term_instance_id: "term-1",
        is_active: true,
        course: { course_scope: CourseScope.PROGRAM_SPECIFIC },
        term_instance: { status: "ACTIVE" },
        course_bound_evaluations: [],
      } as never);

    const missing = await resolveAuthorizedCourseAssignmentRoster("missing");
    const unauthorized = await resolveAuthorizedCourseAssignmentRoster("assignment-1");

    expect(missing).toEqual({ success: false, error: "Course assignment not found." });
    expect(unauthorized).toEqual(missing);
  });

  it("returns only the approved safe reason for an incomplete Student profile", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ roles: [ROLES.SECRETARY] })
    );
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.courseAssignmentMembership.findUnique).mockResolvedValue({
      id: "membership-1",
      is_active: true,
    } as never);
    vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
      id: "assignment-1",
      faculty_id: "faculty-1",
      course_id: "course-1",
      program_id: "program-1",
      term_instance_id: "term-1",
      is_active: true,
      course: { course_scope: CourseScope.PROGRAM_SPECIFIC },
      term_instance: { status: "ACTIVE" },
      course_bound_evaluations: [],
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      is_active: true,
      roles: [{ role: ROLES.STUDENT }],
      student_profile: null,
      enrollments: [],
    } as never);

    await expect(resolveCurrentRosterEligibility("assignment-1", "student-1")).resolves.toEqual({
      success: true,
      data: { eligible: false, reason: "PROFILE_INCOMPLETE" },
    });
  });

  it("accepts any active placement for a General Education assignment", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ roles: [ROLES.SECRETARY] })
    );
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.courseAssignmentMembership.findUnique).mockResolvedValue({
      id: "membership-1",
      is_active: true,
    } as never);
    vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
      id: "assignment-1",
      faculty_id: "faculty-1",
      course_id: "course-1",
      program_id: "program-1",
      term_instance_id: "term-1",
      is_active: true,
      course: { course_scope: CourseScope.GENERAL_EDUCATION },
      term_instance: { status: "ACTIVE" },
      course_bound_evaluations: [],
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      is_active: true,
      roles: [{ role: ROLES.STUDENT }],
      student_profile: { program_id: "program-2", student_id_number: "S0001" },
      enrollments: [{ program_id: "program-2" }],
    } as never);

    await expect(resolveCurrentRosterEligibility("assignment-1", "student-1")).resolves.toEqual({
      success: true,
      data: { eligible: true, reason: null },
    });
  });

  it("treats a profile without a valid Student ID as incomplete", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ roles: [ROLES.SECRETARY] })
    );
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
      id: "assignment-1",
      faculty_id: "faculty-1",
      course_id: "course-1",
      program_id: "program-1",
      term_instance_id: "term-1",
      is_active: true,
      course: { course_scope: CourseScope.PROGRAM_SPECIFIC },
      term_instance: { status: "ACTIVE" },
      course_bound_evaluations: [],
    } as never);
    vi.mocked(prisma.courseAssignmentMembership.findUnique).mockResolvedValue({
      id: "membership-1",
      is_active: true,
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      is_active: true,
      roles: [{ role: ROLES.STUDENT }],
      student_profile: { program_id: "program-1", student_id_number: "1234" },
      enrollments: [{ program_id: "program-1" }],
    } as never);

    await expect(resolveCurrentRosterEligibility("assignment-1", "student-1")).resolves.toEqual({
      success: true,
      data: { eligible: false, reason: "PROFILE_INCOMPLETE" },
    });
  });

  it("excludes inactive roster members from Course-bound participation", () => {
    expect(
      projectCourseBoundEvaluationEligibility({
        assignment: {
          assignmentId: "assignment-1",
          courseScope: CourseScope.PROGRAM_SPECIFIC,
          programId: "program-1",
          termInstanceId: "term-1",
        },
        membershipActive: false,
        student: {
          enrollments: [{ program_id: "program-1" }],
          is_active: true,
          roles: [{ role: ROLES.STUDENT }],
          student_profile: { program_id: "program-1", student_id_number: "S0001" },
        },
      })
    ).toEqual({ eligible: false, reason: null });
  });

  it("restores participation when current eligibility returns", () => {
    expect(
      projectRosterEligibility(
        { courseScope: CourseScope.PROGRAM_SPECIFIC, programId: "program-1" },
        {
          enrollments: [{ program_id: "program-1" }],
          is_active: true,
          roles: [{ role: ROLES.STUDENT }],
          student_profile: { program_id: "program-1", student_id_number: "S0001" },
        }
      )
    ).toEqual({ eligible: true, reason: null });
  });

  it("counts only currently eligible active roster recipients", async () => {
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.evaluationAssignment.findMany).mockResolvedValue([
      {
        respondent_id: "student-eligible",
        course_bound: {
          course_assignment: {
            id: "assignment-1",
            program_id: "program-1",
            term_instance_id: "term-1",
            course: { course_scope: CourseScope.PROGRAM_SPECIFIC },
          },
        },
      },
      {
        respondent_id: "student-ineligible",
        course_bound: {
          course_assignment: {
            id: "assignment-1",
            program_id: "program-1",
            term_instance_id: "term-1",
            course: { course_scope: CourseScope.PROGRAM_SPECIFIC },
          },
        },
      },
    ] as never);
    vi.mocked(prisma.courseAssignmentMembership.findMany).mockResolvedValue([
      {
        course_assignment_id: "assignment-1",
        student_user_id: "student-eligible",
        student: {
          is_active: true,
          roles: [{ role: ROLES.STUDENT }],
          student_profile: { program_id: "program-1", student_id_number: "S0001" },
          enrollments: [{ program_id: "program-1", term_instance_id: "term-1" }],
        },
      },
    ] as never);

    const { countEligibleCourseBoundEvaluationAssignments } =
      await import("@/features/course-assignments/services/course-assignment-roster");

    await expect(countEligibleCourseBoundEvaluationAssignments({})).resolves.toBe(1);
  });

  it("maps unexpected failures to a safe message with a support reference", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ roles: [ROLES.SECRETARY] })
    );
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.courseAssignment.findUnique).mockRejectedValue(new Error("database details"));

    const result = await resolveAuthorizedCourseAssignmentRoster("assignment-1");

    expect(result).toMatchObject({
      success: false,
      error: "The roster request could not be completed.",
    });
    expect(result).toHaveProperty("referenceId");
    expect(JSON.stringify(result)).not.toContain("database details");
  });

  it("does not disclose an assignment outside the selected Program", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "head-1", roles: [ROLES.PROGRAM_HEAD] })
    );
    const { prisma } = await import("@/lib/db/prisma");
    const { resolveProgramHeadContext } = await import(
      "@/features/auth/services/resolve-program-head-context"
    );
    vi.mocked(resolveProgramHeadContext).mockResolvedValue({
      success: true,
      data: {
        userId: "head-1",
        authorizedPrograms: [],
        selectedProgram: { id: "program-1", code: "BSED", name: "Education" },
      },
    });
    vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
      id: "assignment-1",
      faculty_id: "faculty-1",
      course_id: "course-1",
      program_id: "program-2",
      term_instance_id: "term-1",
      is_active: true,
      course: { course_scope: CourseScope.PROGRAM_SPECIFIC },
      term_instance: { status: "ACTIVE" },
      course_bound_evaluations: [],
    } as never);

    await expect(
      resolveAuthorizedCourseAssignmentRoster("assignment-1", { programId: "program-1" })
    ).resolves.toEqual({ success: false, error: "Course assignment not found." });
  });
});
