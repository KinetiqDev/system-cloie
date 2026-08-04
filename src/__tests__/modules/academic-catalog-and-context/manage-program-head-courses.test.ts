import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseScope } from "@prisma/client";
import { createPrismaUniqueConstraintError } from "@/__tests__/helpers/prisma-test-helpers";

const {
  courseCreateMock,
  courseFindUniqueMock,
  courseUpdateManyMock,
  majorFindUniqueMock,
  resolveProgramHeadContextMock,
  revalidateProgramHeadAssignmentMock,
  transactionMock,
} = vi.hoisted(() => ({
  courseCreateMock: vi.fn(),
  courseFindUniqueMock: vi.fn(),
  courseUpdateManyMock: vi.fn(),
  majorFindUniqueMock: vi.fn(),
  resolveProgramHeadContextMock: vi.fn(),
  revalidateProgramHeadAssignmentMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    course: {
      create: courseCreateMock,
      findUnique: courseFindUniqueMock,
      updateMany: courseUpdateManyMock,
    },
    major: { findUnique: majorFindUniqueMock },
    $transaction: transactionMock,
  },
}));

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
  revalidateProgramHeadAssignment: revalidateProgramHeadAssignmentMock,
}));

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BSED_ID = "11111111-1111-4111-8111-111111111111";
const BEED_ID = "22222222-2222-4222-8222-222222222222";
const MAJOR_ID = "33333333-3333-4333-8333-333333333333";
const OTHER_MAJOR_ID = "44444444-4444-4444-8444-444444444444";
const COURSE_ID = "55555555-5555-4555-8555-555555555555";

const BSED = { id: BSED_ID, code: "BSED", name: "Secondary Education" };
const BEED = { id: BEED_ID, code: "BEED", name: "Elementary Education" };

function input(overrides: Record<string, unknown> = {}) {
  return {
    programId: BSED_ID,
    code: "IT-301",
    title: "Web Development",
    course_scope: CourseScope.PROGRAM_SPECIFIC,
    ...overrides,
  } as never;
}

describe("manage-program-head-courses", () => {
  let createProgramHeadCourse: typeof import("@/features/academic-structure/services/manage-program-head-courses").createProgramHeadCourse;
  let updateProgramHeadCourse: typeof import("@/features/academic-structure/services/manage-program-head-courses").updateProgramHeadCourse;
  let toggleProgramHeadCourseActive: typeof import("@/features/academic-structure/services/manage-program-head-courses").toggleProgramHeadCourseActive;

  beforeEach(async () => {
    vi.clearAllMocks();
    resolveProgramHeadContextMock.mockImplementation(async (programId: string) => ({
      success: true,
      data: {
        userId: USER_ID,
        authorizedPrograms: [BEED, BSED],
        selectedProgram: programId === BEED_ID ? BEED : BSED,
      },
    }));
    revalidateProgramHeadAssignmentMock.mockResolvedValue(BSED);
    transactionMock.mockImplementation(async (callback) =>
      callback({
        course: {
          create: courseCreateMock,
          findUnique: courseFindUniqueMock,
          updateMany: courseUpdateManyMock,
        },
        major: { findUnique: majorFindUniqueMock },
      })
    );
    courseCreateMock.mockResolvedValue({ id: COURSE_ID });
    courseUpdateManyMock.mockResolvedValue({ count: 1 });

    const mod = await import("@/features/academic-structure/services/manage-program-head-courses");
    createProgramHeadCourse = mod.createProgramHeadCourse;
    updateProgramHeadCourse = mod.updateProgramHeadCourse;
    toggleProgramHeadCourseActive = mod.toggleProgramHeadCourseActive;
  });

  it("creates a program-wide course for the explicitly selected Program", async () => {
    await expect(createProgramHeadCourse(input())).resolves.toEqual({
      success: true,
      data: { id: COURSE_ID },
    });
    expect(resolveProgramHeadContextMock).toHaveBeenCalledWith(BSED_ID);
    expect(revalidateProgramHeadAssignmentMock).toHaveBeenCalledWith(
      expect.anything(),
      { userId: USER_ID, programId: BSED_ID }
    );
    expect(courseCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ program_id: BSED_ID, major_id: null }),
    });
  });

  it("never uses another authorized Program's assignment order for creation", async () => {
    await createProgramHeadCourse(input({ programId: BEED_ID }));
    expect(courseCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ program_id: BEED_ID }),
    });
    expect(courseCreateMock).not.toHaveBeenCalledWith({
      data: expect.objectContaining({ program_id: BSED_ID }),
    });
  });

  it("requires a major to belong to the selected Program", async () => {
    majorFindUniqueMock.mockResolvedValue({
      id: OTHER_MAJOR_ID,
      program_id: BEED_ID,
      is_active: true,
    });

    await expect(createProgramHeadCourse(input({ major_id: OTHER_MAJOR_ID }))).resolves.toEqual({
      success: false,
      error: "Selected major does not belong to the selected program.",
    });
    expect(courseCreateMock).not.toHaveBeenCalled();
  });

  it("accepts a major belonging to the selected Program", async () => {
    majorFindUniqueMock.mockResolvedValue({ id: MAJOR_ID, program_id: BSED_ID, is_active: true });

    await expect(createProgramHeadCourse(input({ major_id: MAJOR_ID }))).resolves.toMatchObject({
      success: true,
    });
    expect(courseCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ program_id: BSED_ID, major_id: MAJOR_ID }),
    });
  });

  it("rejects creation when the selected assignment is inactive inside the transaction", async () => {
    revalidateProgramHeadAssignmentMock.mockResolvedValue(null);

    await expect(createProgramHeadCourse(input())).resolves.toEqual({
      success: false,
      error: "Selected Program is no longer assigned.",
    });
    expect(courseCreateMock).not.toHaveBeenCalled();
  });

  it("keeps General Education management forbidden", async () => {
    courseFindUniqueMock.mockResolvedValue({
      id: COURSE_ID,
      program_id: null,
      course_scope: CourseScope.GENERAL_EDUCATION,
    });

    await expect(
      updateProgramHeadCourse(input({ id: COURSE_ID, title: "Updated" }))
    ).resolves.toEqual({
      success: false,
      error: "General education courses cannot be modified by Program Heads.",
    });
    expect(courseUpdateManyMock).not.toHaveBeenCalled();
  });

  it("rejects edits to a Course owned by another selected Program", async () => {
    courseFindUniqueMock.mockResolvedValue({
      id: COURSE_ID,
      program_id: BEED_ID,
      course_scope: CourseScope.PROGRAM_SPECIFIC,
    });

    await expect(
      updateProgramHeadCourse(input({ id: COURSE_ID, title: "Cross-program edit" }))
    ).resolves.toEqual({
      success: false,
      error: "You do not have permission to modify this course.",
    });
    expect(courseUpdateManyMock).not.toHaveBeenCalled();
  });

  it("revalidates Course ownership and updates an owned Course in one transaction", async () => {
    courseFindUniqueMock.mockResolvedValue({
      id: COURSE_ID,
      program_id: BSED_ID,
      course_scope: CourseScope.PROGRAM_SPECIFIC,
    });

    await expect(updateProgramHeadCourse(input({ id: COURSE_ID }))).resolves.toEqual({
      success: true,
      data: { id: COURSE_ID },
    });
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(courseUpdateManyMock).toHaveBeenCalledWith({
      where: { id: COURSE_ID, program_id: BSED_ID, course_scope: CourseScope.PROGRAM_SPECIFIC },
      data: expect.objectContaining({ program_id: BSED_ID }),
    });
  });

  it("rejects an ownership change that occurs after the transaction read", async () => {
    courseFindUniqueMock.mockResolvedValue({
      id: COURSE_ID,
      program_id: BSED_ID,
      course_scope: CourseScope.PROGRAM_SPECIFIC,
    });
    courseUpdateManyMock.mockResolvedValue({ count: 0 });

    await expect(updateProgramHeadCourse(input({ id: COURSE_ID }))).resolves.toEqual({
      success: false,
      error: "You do not have permission to modify this course.",
    });
  });

  it("rejects toggle when the selected assignment is revoked before the write", async () => {
    revalidateProgramHeadAssignmentMock.mockResolvedValue(null);

    await expect(
      toggleProgramHeadCourseActive({ programId: BSED_ID, id: COURSE_ID, is_active: false })
    ).resolves.toEqual({
      success: false,
      error: "Selected Program is no longer assigned.",
    });
    expect(courseFindUniqueMock).not.toHaveBeenCalled();
    expect(courseUpdateManyMock).not.toHaveBeenCalled();
  });

  it("rejects toggle for a Course owned by another Program", async () => {
    courseFindUniqueMock.mockResolvedValue({
      id: COURSE_ID,
      program_id: BEED_ID,
      course_scope: CourseScope.PROGRAM_SPECIFIC,
    });

    await expect(
      toggleProgramHeadCourseActive({ programId: BSED_ID, id: COURSE_ID, is_active: false })
    ).resolves.toEqual({
      success: false,
      error: "You do not have permission to modify this course.",
    });
    expect(courseUpdateManyMock).not.toHaveBeenCalled();
  });

  it("maps duplicate Course codes to a safe error", async () => {
    courseCreateMock.mockRejectedValue(createPrismaUniqueConstraintError());

    await expect(createProgramHeadCourse(input())).resolves.toEqual({
      success: false,
      error: 'A course with code "IT-301" already exists.',
    });
  });
});
