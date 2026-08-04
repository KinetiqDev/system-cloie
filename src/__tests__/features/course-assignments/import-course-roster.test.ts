import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseScope } from "@prisma/client";

import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";
import * as authModule from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import * as rosterModule from "@/features/course-assignments/services/course-assignment-roster";
import * as manageModule from "@/features/course-assignments/services/manage-course-roster";
import { importCourseRoster } from "@/features/course-assignments/services/import-course-roster";

const prismaMock = vi.hoisted(() => ({
  user: { findMany: vi.fn() },
  courseAssignmentMembership: { findMany: vi.fn() },
}));

vi.mock("@/features/auth/services/resolve-auth-session");
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/features/course-assignments/services/manage-course-roster");
vi.mock("@/features/course-assignments/services/course-assignment-roster");

const assignment = {
  assignmentId: "assignment-1",
  facultyId: "faculty-1",
  courseId: "course-1",
  programId: "program-1",
  termInstanceId: "term-1",
  courseScope: CourseScope.PROGRAM_SPECIFIC,
  isActive: true,
  periodStatus: "ACTIVE" as const,
  hasPublishedEvaluation: false,
  canManage: true,
  canMutate: true,
  mutabilityReason: null,
};

const student = (email: string, id: string) => ({
  id,
  email,
  is_active: true,
  roles: [{ role: ROLES.STUDENT }],
  student_profile: { program_id: "program-1", student_id_number: "S00001" },
  enrollments: [{ program_id: "program-1" }],
});

describe("import course roster service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "manager-1", roles: [ROLES.SECRETARY] })
    );
    vi.mocked(rosterModule.resolveAuthorizedCourseAssignmentRoster).mockResolvedValue({
      success: true,
      data: assignment,
    });
    vi.mocked(rosterModule.projectRosterEligibility).mockReturnValue({ eligible: true, reason: null });
    vi.mocked(manageModule.addRosterMembership).mockResolvedValue({
      success: true,
      data: { outcome: "CREATED", message: "Student added to Course roster." },
    });
    prismaMock.user.findMany.mockResolvedValue([
      student("one@example.com", "student-1"),
      student("two@example.com", "student-2"),
    ] as never);
    prismaMock.courseAssignmentMembership.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
  });

  it("keeps valid rows, reports malformed and duplicate rows, and writes only first occurrence", async () => {
    const result = await importCourseRoster(
      "assignment-1",
      "email\nONE@EXAMPLE.COM\nnot-an-email\none@example.com\ntwo@example.com\n"
    );

    expect(result).toEqual({
      success: true,
      data: expect.objectContaining({
        total: 4,
        created: 2,
        failed: 2,
        rows: [
          expect.objectContaining({ sourceIndex: 2, status: "CREATED", email: "ONE@EXAMPLE.COM" }),
          expect.objectContaining({ sourceIndex: 3, status: "MALFORMED_EMAIL" }),
          expect.objectContaining({ sourceIndex: 4, status: "DUPLICATE_EMAIL" }),
          expect.objectContaining({ sourceIndex: 5, status: "CREATED" }),
        ],
      }),
    });
    expect(manageModule.addRosterMembership).toHaveBeenCalledTimes(2);
    expect(manageModule.addRosterMembership).toHaveBeenNthCalledWith(1, "assignment-1", "one@example.com");
  });

  it("preserves completed writes and marks remaining rows after unexpected failure", async () => {
    vi.mocked(manageModule.addRosterMembership)
      .mockResolvedValueOnce({ success: true, data: { outcome: "CREATED", message: "created" } })
      .mockResolvedValueOnce({
        success: false,
        error: "The roster request could not be completed.",
        referenceId: "support-ref",
      });

    const result = await importCourseRoster(
      "assignment-1",
      "email\none@example.com\ntwo@example.com\nthree@example.com\n"
    );

    expect(result).toMatchObject({ success: true, data: { created: 1, failed: 1, unprocessed: 1, referenceId: "support-ref" } });
    if (result.success) {
      expect(result.data.rows.map((row) => row.status)).toEqual([
        "CREATED",
        "UNEXPECTED_FAILURE",
        "UNPROCESSED",
      ]);
    }
    expect(manageModule.addRosterMembership).toHaveBeenCalledTimes(2);
  });

  it("reports restored outcome and maps transaction-safe business failures", async () => {
    vi.mocked(manageModule.addRosterMembership)
      .mockResolvedValueOnce({ success: true, data: { outcome: "RESTORED", message: "restored" } })
      .mockResolvedValueOnce({ success: false, error: "Student is already active in another section for this Course and Academic Period." });

    const result = await importCourseRoster("assignment-1", "email\none@example.com\ntwo@example.com\n");

    expect(result).toMatchObject({ success: true, data: { restored: 1, failed: 1 } });
    if (result.success) expect(result.data.rows.map((row) => row.status)).toEqual(["RESTORED", "OTHER_SECTION_CONFLICT"]);
  });

  it("reports pre-read account and section outcomes without writes", async () => {
    prismaMock.user.findMany.mockResolvedValue([student("one@example.com", "student-1")] as never);
    prismaMock.courseAssignmentMembership.findMany.mockReset();
    prismaMock.courseAssignmentMembership.findMany
      .mockResolvedValueOnce([{ student_user_id: "student-1", is_active: true }])
      .mockResolvedValueOnce([]);

    const result = await importCourseRoster("assignment-1", "email\nmissing@example.com\none@example.com\n");

    expect(result).toMatchObject({ success: true, data: { created: 0, failed: 2 } });
    expect(manageModule.addRosterMembership).not.toHaveBeenCalled();
  });

  it("preserves row results when the eligibility pre-read fails", async () => {
    const internalError = "database secret";
    prismaMock.user.findMany.mockRejectedValue(new Error(internalError));

    const result = await importCourseRoster(
      "assignment-1",
      "email\none@example.com\ntwo@example.com\nthree@example.com\n"
    );

    expect(result).toMatchObject({
      success: true,
      data: {
        total: 3,
        created: 0,
        restored: 0,
        failed: 1,
        unprocessed: 2,
        referenceId: expect.any(String),
      },
    });
    if (result.success) {
      expect(result.data.rows.map((row) => row.status)).toEqual([
        "UNEXPECTED_FAILURE",
        "UNPROCESSED",
        "UNPROCESSED",
      ]);
      expect(result.data.rows.every((row) => row.error.includes(result.data.referenceId!))).toBe(true);
    }
    expect(JSON.stringify(result)).not.toContain(internalError);
    expect(manageModule.addRosterMembership).not.toHaveBeenCalled();
  });

  it("carries selected Program scope through authorization and each membership write", async () => {
    const programId = "program-1";
    await importCourseRoster("assignment-1", "email\none@example.com\n", programId);

    expect(rosterModule.resolveAuthorizedCourseAssignmentRoster).toHaveBeenCalledWith(
      "assignment-1",
      { manage: true, programId }
    );
    expect(manageModule.addRosterMembership).toHaveBeenCalledWith(
      "assignment-1",
      "one@example.com",
      programId
    );
  });
});
