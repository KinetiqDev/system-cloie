import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseScope } from "@prisma/client";

import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";
import { ROLES } from "@/lib/constants/roles";
import * as authModule from "@/features/auth/services/resolve-auth-session";
import {
  resolveAuthorizedCourseAssignmentRoster,
  resolveCurrentRosterEligibility,
} from "@/features/course-assignments/services/course-assignment-roster";

vi.mock("@/features/auth/services/resolve-auth-session");
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    courseAssignment: { findUnique: vi.fn() },
    courseAssignmentMembership: { findUnique: vi.fn() },
    programHeadAssignment: { findMany: vi.fn() },
    user: { findUnique: vi.fn() },
  },
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
    vi.mocked(prisma.courseAssignmentMembership.findUnique).mockResolvedValue({ id: "membership-1", is_active: true } as never);
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
    vi.mocked(prisma.courseAssignmentMembership.findUnique).mockResolvedValue({ id: "membership-1", is_active: true } as never);
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

    await expect(
      resolveCurrentRosterEligibility(
        "assignment-1",
        "student-1"
      )
    ).resolves.toEqual({
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

    await expect(
      resolveCurrentRosterEligibility(
        "assignment-1",
        "student-1"
      )
    ).resolves.toEqual({ success: true, data: { eligible: true, reason: null } });
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
});
