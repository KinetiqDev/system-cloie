import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROLES } from "@/lib/constants/roles";
import {
  runTermRollover,
  previewTermRollover,
} from "@/features/academic-calendar/services/run-term-rollover";

const {
  resolveAuthSessionMock,
  termInstanceFindManyMock,
  termInstanceFindUniqueMock,
  studentEnrollmentFindManyMock,
  studentEnrollmentCreateManyMock,
  schoolYearFindUniqueMock,
  transactionMock,
} = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  termInstanceFindManyMock: vi.fn(),
  termInstanceFindUniqueMock: vi.fn(),
  studentEnrollmentFindManyMock: vi.fn(),
  studentEnrollmentCreateManyMock: vi.fn(),
  schoolYearFindUniqueMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    academicTermInstance: {
      findMany: termInstanceFindManyMock,
      findUnique: termInstanceFindUniqueMock,
    },
    studentEnrollment: {
      findMany: studentEnrollmentFindManyMock,
      createMany: studentEnrollmentCreateManyMock,
    },
    schoolYear: {
      findUnique: schoolYearFindUniqueMock,
    },
    $transaction: transactionMock,
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

// ─── Test Helpers ────────────────────────────────────────────────────────────

function mockAuthenticatedAdmin() {
  resolveAuthSessionMock.mockResolvedValue({
    activeRole: ROLES.SECRETARY,
    roles: [ROLES.SECRETARY],
    userId: "admin-1",
  });
}

function mockNonAdmin() {
  resolveAuthSessionMock.mockResolvedValue({
    activeRole: ROLES.STUDENT,
    roles: [ROLES.STUDENT],
    userId: "student-1",
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("runTermRollover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin users", async () => {
    mockNonAdmin();

    const result = await runTermRollover({
      sourceTermInstanceId: "term-1",
      targetTermInstanceId: "term-2",
    });

    expect(result).toEqual({
      success: false,
      error: "Admin access required.",
    });
  });

  it("returns error when source term not found", async () => {
    mockAuthenticatedAdmin();
    termInstanceFindUniqueMock.mockResolvedValueOnce(null);

    const result = await runTermRollover({
      sourceTermInstanceId: "term-1",
      targetTermInstanceId: "term-2",
    });

    expect(result).toEqual({
      success: false,
      error: "Source term instance not found.",
    });
  });

  it("returns error when target term not found", async () => {
    mockAuthenticatedAdmin();
    termInstanceFindUniqueMock
      .mockResolvedValueOnce({
        id: "term-1",
        school_year: { is_archived: false, code: "2025-2026", id: "sy-1" },
      })
      .mockResolvedValueOnce(null);

    const result = await runTermRollover({
      sourceTermInstanceId: "term-1",
      targetTermInstanceId: "term-2",
    });

    expect(result).toEqual({
      success: false,
      error: "Target term instance not found.",
    });
  });

  it("promotes 1st year to 2nd year across school years", async () => {
    mockAuthenticatedAdmin();

    // Mock term instances in different school years
    termInstanceFindUniqueMock
      .mockResolvedValueOnce({
        id: "term-1",
        school_year: { is_archived: false, code: "2025-2026", id: "sy-1" },
      })
      .mockResolvedValueOnce({
        id: "term-2",
        school_year: { is_archived: false, code: "2026-2027", id: "sy-2" },
      });

    // Mock source enrollments - 1st year student
    studentEnrollmentFindManyMock.mockResolvedValueOnce([
      {
        student_user_id: "student-1",
        program_id: "program-1",
        major_id: "major-1",
        year_level: "FIRST_YEAR",
        section: null,
        is_active: true,
        student: {
          id: "student-1",
          email: "student1@test.com",
          name: "John Doe",
        },
      },
    ]);

    // Mock no existing enrollments in target term
    studentEnrollmentFindManyMock.mockResolvedValueOnce([]);

    // Mock createMany result
    studentEnrollmentCreateManyMock.mockResolvedValue({ count: 1 });

    // Mock transaction
    transactionMock.mockImplementation(async (callback) => {
      return await callback({
        studentEnrollment: {
          createMany: studentEnrollmentCreateManyMock,
        },
      });
    });

    const result = await runTermRollover({
      sourceTermInstanceId: "term-1",
      targetTermInstanceId: "term-2",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.processedCount).toBe(1);
      expect(result.data.createdCount).toBe(1);
      expect(result.data.exceptions).toHaveLength(0);
    }
    expect(studentEnrollmentCreateManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          student_user_id: "student-1",
          term_instance_id: "term-2",
          year_level: "SECOND_YEAR",
        }),
      ],
      skipDuplicates: true,
    });
  });

  it("preserves year level within the same school year", async () => {
    mockAuthenticatedAdmin();

    termInstanceFindUniqueMock
      .mockResolvedValueOnce({
        id: "term-1",
        school_year: { is_archived: false, code: "2025-2026", id: "sy-1" },
      })
      .mockResolvedValueOnce({
        id: "term-2",
        school_year: { is_archived: false, code: "2025-2026", id: "sy-1" },
      });

    studentEnrollmentFindManyMock.mockResolvedValueOnce([
      {
        student_user_id: "student-1",
        program_id: "program-1",
        major_id: "major-1",
        year_level: "SECOND_YEAR",
        section: null,
        is_active: true,
        student: {
          id: "student-1",
          email: "student1@test.com",
          name: "John Doe",
        },
      },
    ]);

    studentEnrollmentFindManyMock.mockResolvedValueOnce([]);
    studentEnrollmentCreateManyMock.mockResolvedValue({ count: 1 });
    transactionMock.mockImplementation(async (callback) => {
      return await callback({
        studentEnrollment: {
          createMany: studentEnrollmentCreateManyMock,
        },
      });
    });

    const result = await runTermRollover({
      sourceTermInstanceId: "term-1",
      targetTermInstanceId: "term-2",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.processedCount).toBe(1);
      expect(result.data.createdCount).toBe(1);
      expect(result.data.exceptions).toHaveLength(0);
    }
    expect(studentEnrollmentCreateManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          student_user_id: "student-1",
          term_instance_id: "term-2",
          year_level: "SECOND_YEAR",
        }),
      ],
      skipDuplicates: true,
    });
  });

  it("carries a 4th year student unchanged within the same school year", async () => {
    mockAuthenticatedAdmin();

    termInstanceFindUniqueMock
      .mockResolvedValueOnce({
        id: "term-1",
        school_year: { is_archived: false, code: "2025-2026", id: "sy-1" },
      })
      .mockResolvedValueOnce({
        id: "term-2",
        school_year: { is_archived: false, code: "2025-2026", id: "sy-1" },
      });

    studentEnrollmentFindManyMock.mockResolvedValueOnce([
      {
        student_user_id: "student-4",
        program_id: "program-1",
        major_id: "major-1",
        year_level: "FOURTH_YEAR",
        section: null,
        is_active: true,
        student: {
          id: "student-4",
          email: "senior@test.com",
          name: "Jane Smith",
        },
      },
    ]);

    studentEnrollmentFindManyMock.mockResolvedValueOnce([]);
    studentEnrollmentCreateManyMock.mockResolvedValue({ count: 1 });
    transactionMock.mockImplementation(async (callback) => {
      return await callback({
        studentEnrollment: {
          createMany: studentEnrollmentCreateManyMock,
        },
      });
    });

    const result = await runTermRollover({
      sourceTermInstanceId: "term-1",
      targetTermInstanceId: "term-2",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.processedCount).toBe(1);
      expect(result.data.createdCount).toBe(1);
      expect(result.data.exceptions).toHaveLength(0);
    }
    expect(studentEnrollmentCreateManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          student_user_id: "student-4",
          year_level: "FOURTH_YEAR",
        }),
      ],
      skipDuplicates: true,
    });
  });

  it("flags 4th year students as graduating exception on cross-school-year rollover", async () => {
    mockAuthenticatedAdmin();

    termInstanceFindUniqueMock
      .mockResolvedValueOnce({
        id: "term-1",
        school_year: { is_archived: false, code: "2025-2026", id: "sy-1" },
      })
      .mockResolvedValueOnce({
        id: "term-2",
        school_year: { is_archived: false, code: "2026-2027", id: "sy-2" },
      });

    // 4th year student (graduating)
    studentEnrollmentFindManyMock.mockResolvedValueOnce([
      {
        student_user_id: "student-4",
        program_id: "program-1",
        major_id: "major-1",
        year_level: "FOURTH_YEAR",
        section: null,
        is_active: true,
        student: {
          id: "student-4",
          email: "senior@test.com",
          name: "Jane Smith",
        },
      },
    ]);

    studentEnrollmentFindManyMock.mockResolvedValueOnce([]);

    const result = await runTermRollover({
      sourceTermInstanceId: "term-1",
      targetTermInstanceId: "term-2",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.processedCount).toBe(1);
      expect(result.data.createdCount).toBe(0); // No enrollment created
      expect(result.data.exceptions).toHaveLength(1);
      expect(result.data.exceptions[0].exceptionType).toBe("GRADUATING");
      expect(result.data.exceptions[0].currentYearLevel).toBe("FOURTH_YEAR");
    }
  });

  it("skips students already enrolled in target term (idempotency)", async () => {
    mockAuthenticatedAdmin();

    termInstanceFindUniqueMock
      .mockResolvedValueOnce({
        id: "term-1",
        school_year: { is_archived: false, code: "2025-2026", id: "sy-1" },
      })
      .mockResolvedValueOnce({
        id: "term-2",
        school_year: { is_archived: false, code: "2025-2026", id: "sy-1" },
      });

    studentEnrollmentFindManyMock.mockResolvedValueOnce([
      {
        student_user_id: "student-1",
        program_id: "program-1",
        major_id: "major-1",
        year_level: "SECOND_YEAR",
        section: null,
        is_active: true,
        student: {
          id: "student-1",
          email: "student1@test.com",
          name: "John Doe",
        },
      },
    ]);

    // Student already enrolled in target term
    studentEnrollmentFindManyMock.mockResolvedValueOnce([
      { student_user_id: "student-1" },
    ]);

    const result = await runTermRollover({
      sourceTermInstanceId: "term-1",
      targetTermInstanceId: "term-2",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.processedCount).toBe(1);
      expect(result.data.createdCount).toBe(0); // Skipped
      expect(result.data.skippedCount).toBe(1);
    }
  });

  it("flags students with missing program as exception", async () => {
    mockAuthenticatedAdmin();

    termInstanceFindUniqueMock
      .mockResolvedValueOnce({
        id: "term-1",
        school_year: { is_archived: false, code: "2025-2026", id: "sy-1" },
      })
      .mockResolvedValueOnce({
        id: "term-2",
        school_year: { is_archived: false, code: "2025-2026", id: "sy-1" },
      });

    // Student without program_id
    studentEnrollmentFindManyMock.mockResolvedValueOnce([
      {
        student_user_id: "student-orphan",
        program_id: null,
        major_id: null,
        year_level: "SECOND_YEAR",
        section: null,
        is_active: true,
        student: {
          id: "student-orphan",
          email: "orphan@test.com",
          name: "Orphan O'Student",
        },
      },
    ]);

    studentEnrollmentFindManyMock.mockResolvedValueOnce([]);

    const result = await runTermRollover({
      sourceTermInstanceId: "term-1",
      targetTermInstanceId: "term-2",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.exceptions).toHaveLength(1);
      expect(result.data.exceptions[0].exceptionType).toBe("MISSING_DATA");
    }
  });
});

describe("previewTermRollover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns preview without creating enrollments across school years", async () => {
    mockAuthenticatedAdmin();

    termInstanceFindUniqueMock
      .mockResolvedValueOnce({
        id: "term-1",
        school_year: { is_archived: false, code: "2025-2026", id: "sy-1" },
      })
      .mockResolvedValueOnce({
        id: "term-2",
        school_year: { is_archived: false, code: "2026-2027", id: "sy-2" },
      });

    studentEnrollmentFindManyMock.mockResolvedValueOnce([
      {
        student_user_id: "student-1",
        program_id: "program-1",
        major_id: "major-1",
        year_level: "FIRST_YEAR",
        section: null,
        is_active: true,
        student: {
          id: "student-1",
          email: "student1@test.com",
          name: "John Doe",
        },
      },
      {
        student_user_id: "student-4",
        program_id: "program-1",
        major_id: "major-1",
        year_level: "FOURTH_YEAR",
        section: null,
        is_active: true,
        student: {
          id: "student-4",
          email: "senior@test.com",
          name: "Jane Smith",
        },
      },
    ]);

    studentEnrollmentFindManyMock.mockResolvedValueOnce([]);

    const result = await previewTermRollover({
      sourceTermInstanceId: "term-1",
      targetTermInstanceId: "term-2",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.wouldProcessCount).toBe(2);
      expect(result.data.wouldCreateCount).toBe(1); // Only 1st year promoted
      expect(result.data.exceptions).toHaveLength(1); // 4th year graduating
      expect(result.data.exceptions[0]?.studentName).toBe("Jane Smith");
    }

    // Preview query order must match canonical-name execution ordering.
    expect(studentEnrollmentFindManyMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        orderBy: [{ student: { name: "asc" } }, { student_user_id: "asc" }],
        include: {
          student: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      })
    );

    // Verify no database writes occurred
    expect(studentEnrollmentCreateManyMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("previews preserved year levels within the same school year", async () => {
    mockAuthenticatedAdmin();

    termInstanceFindUniqueMock
      .mockResolvedValueOnce({
        id: "term-1",
        school_year: { is_archived: false, code: "2025-2026", id: "sy-1" },
      })
      .mockResolvedValueOnce({
        id: "term-2",
        school_year: { is_archived: false, code: "2025-2026", id: "sy-1" },
      });

    studentEnrollmentFindManyMock.mockResolvedValueOnce([
      {
        student_user_id: "student-1",
        program_id: "program-1",
        major_id: "major-1",
        year_level: "SECOND_YEAR",
        section: null,
        is_active: true,
        student: {
          id: "student-1",
          email: "student1@test.com",
          name: "John Doe",
        },
      },
      {
        student_user_id: "student-4",
        program_id: "program-1",
        major_id: "major-1",
        year_level: "FOURTH_YEAR",
        section: null,
        is_active: true,
        student: {
          id: "student-4",
          email: "senior@test.com",
          name: "Jane Smith",
        },
      },
    ]);

    studentEnrollmentFindManyMock.mockResolvedValueOnce([]);

    const result = await previewTermRollover({
      sourceTermInstanceId: "term-1",
      targetTermInstanceId: "term-2",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.wouldProcessCount).toBe(2);
      expect(result.data.wouldCreateCount).toBe(2); // Both carried over unchanged
      expect(result.data.exceptions).toHaveLength(0); // No graduation within a school year
    }

    expect(studentEnrollmentCreateManyMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });
});
