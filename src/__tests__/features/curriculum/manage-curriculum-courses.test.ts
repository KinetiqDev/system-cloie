import { beforeEach, describe, expect, it, vi } from "vitest";
import { AcademicSemester, AcademicTerm, CourseScope, YearLevel } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";
import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    curriculumVersion: {
      findUnique: vi.fn(),
    },
    curriculumCourse: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    course: {
      findUnique: vi.fn(),
    },
    programHeadAssignment: {
      findFirst: vi.fn(),
    },
  },
}));

import * as authModule from "@/features/auth/services/resolve-auth-session";
import { prisma } from "@/lib/db/prisma";
import {
  addCurriculumCourse,
  removeCurriculumCourse,
  updateCurriculumCourse,
} from "@/features/curriculum/services/manage-curriculum-courses";

const VERSION_ID = "11111111-1111-4111-8111-111111111111";
const COURSE_ID = "44444444-4444-4444-8444-444444444444";
const COURSE_ROW_ID = "55555555-5555-4555-8555-555555555555";
const PROGRAM_ID = "22222222-2222-4222-8222-222222222222";

const secretary = createAuthSessionSnapshot({
  userId: "secretary-1",
  roles: [ROLES.SECRETARY],
});
const programHead = createAuthSessionSnapshot({
  userId: "ph-1",
  roles: [ROLES.PROGRAM_HEAD],
});

function draftVersion() {
  return { id: VERSION_ID, status: "DRAFT", program_id: PROGRAM_ID };
}

describe("manage-curriculum-courses / addCurriculumCourse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary);
    vi.mocked(prisma.$transaction).mockImplementation((callback) =>
      callback(prisma as never)
    );
  });

  it("captures code and title snapshots from the Course on a DRAFT version", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue(draftVersion() as never);
    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      id: COURSE_ID,
      code: "IT201",
      title: "Introduction to Programming",
      program_id: PROGRAM_ID,
      course_scope: CourseScope.PROGRAM_SPECIFIC,
    } as never);
    vi.mocked(prisma.curriculumCourse.create).mockResolvedValue({ id: COURSE_ROW_ID } as never);

    const result = await addCurriculumCourse({
      curriculumVersionId: VERSION_ID,
      courseId: COURSE_ID,
      yearLevel: YearLevel.FIRST_YEAR,
      semester: AcademicSemester.FIRST,
      term: AcademicTerm.FIRST_TERM,
    });

    expect(result).toEqual({ success: true, data: { id: COURSE_ROW_ID } });
    expect(prisma.curriculumCourse.create).toHaveBeenCalledWith({
      data: {
        curriculum_version_id: VERSION_ID,
        course_id: COURSE_ID,
        year_level: YearLevel.FIRST_YEAR,
        semester: AcademicSemester.FIRST,
        term: AcademicTerm.FIRST_TERM,
        course_code_snapshot: "IT201",
        course_title_snapshot: "Introduction to Programming",
      },
      select: { id: true },
    });
  });

  it("stores a null term for SUMMER placements", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue(draftVersion() as never);
    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      id: COURSE_ID,
      code: "IT201",
      title: "Introduction to Programming",
      program_id: PROGRAM_ID,
      course_scope: CourseScope.PROGRAM_SPECIFIC,
    } as never);
    vi.mocked(prisma.curriculumCourse.create).mockResolvedValue({ id: COURSE_ROW_ID } as never);

    const result = await addCurriculumCourse({
      curriculumVersionId: VERSION_ID,
      courseId: COURSE_ID,
      yearLevel: YearLevel.SECOND_YEAR,
      semester: AcademicSemester.SUMMER,
      term: null,
    });

    expect(result.success).toBe(true);
    expect(prisma.curriculumCourse.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ term: null }),
      })
    );
  });

  it("rejects adding a course to a PUBLISHED version", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue({
      ...draftVersion(),
      status: "PUBLISHED",
    } as never);

    const result = await addCurriculumCourse({
      curriculumVersionId: VERSION_ID,
      courseId: COURSE_ID,
      yearLevel: YearLevel.FIRST_YEAR,
      semester: AcademicSemester.FIRST,
      term: AcademicTerm.FIRST_TERM,
    });

    expect(result).toEqual({
      success: false,
      error: "Published curricula are immutable",
    });
    expect(prisma.curriculumCourse.create).not.toHaveBeenCalled();
  });

  it("rejects adding a course to a RETIRED version", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue({
      ...draftVersion(),
      status: "RETIRED",
    } as never);

    const result = await addCurriculumCourse({
      curriculumVersionId: VERSION_ID,
      courseId: COURSE_ID,
      yearLevel: YearLevel.FIRST_YEAR,
      semester: AcademicSemester.FIRST,
      term: AcademicTerm.FIRST_TERM,
    });

    expect(result).toEqual({
      success: false,
      error: "Published curricula are immutable",
    });
  });

  it("rejects unknown versions", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue(null);

    const result = await addCurriculumCourse({
      curriculumVersionId: VERSION_ID,
      courseId: COURSE_ID,
      yearLevel: YearLevel.FIRST_YEAR,
      semester: AcademicSemester.FIRST,
      term: AcademicTerm.FIRST_TERM,
    });

    expect(result).toEqual({ success: false, error: "Curriculum version not found" });
  });

  it("rejects unknown courses", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue(draftVersion() as never);
    vi.mocked(prisma.course.findUnique).mockResolvedValue(null);

    const result = await addCurriculumCourse({
      curriculumVersionId: VERSION_ID,
      courseId: COURSE_ID,
      yearLevel: YearLevel.FIRST_YEAR,
      semester: AcademicSemester.FIRST,
      term: AcademicTerm.FIRST_TERM,
    });

    expect(result).toEqual({ success: false, error: "Course not found" });
    expect(prisma.curriculumCourse.create).not.toHaveBeenCalled();
  });

  it("rejects an invalid semester/term pair at the schema layer", async () => {
    const result = await addCurriculumCourse({
      curriculumVersionId: VERSION_ID,
      courseId: COURSE_ID,
      yearLevel: YearLevel.FIRST_YEAR,
      semester: AcademicSemester.SUMMER,
      term: AcademicTerm.FIRST_TERM,
    });

    expect(result.success).toBe(false);
    expect(prisma.curriculumCourse.create).not.toHaveBeenCalled();
  });

  it("rejects a Program Head adding to a version outside their assignment set", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(programHead);
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue(draftVersion() as never);
    vi.mocked(prisma.programHeadAssignment.findFirst).mockResolvedValue(null);

    const result = await addCurriculumCourse({
      curriculumVersionId: VERSION_ID,
      courseId: COURSE_ID,
      yearLevel: YearLevel.FIRST_YEAR,
      semester: AcademicSemester.FIRST,
      term: AcademicTerm.FIRST_TERM,
    });

    expect(result).toEqual({
      success: false,
      error: "Program Head access is limited to assigned programs",
    });
  });

  it("rejects a program-specific course owned by another program", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue(draftVersion() as never);
    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      id: COURSE_ID,
      code: "BSBA-101",
      title: "Business Fundamentals",
      program_id: "99999999-9999-4999-8999-999999999999",
      course_scope: CourseScope.PROGRAM_SPECIFIC,
    } as never);

    const result = await addCurriculumCourse({
      curriculumVersionId: VERSION_ID,
      courseId: COURSE_ID,
      yearLevel: YearLevel.FIRST_YEAR,
      semester: AcademicSemester.FIRST,
      term: AcademicTerm.FIRST_TERM,
    });

    expect(result).toEqual({
      success: false,
      error: "Course does not belong to this program",
    });
    expect(prisma.curriculumCourse.create).not.toHaveBeenCalled();
  });

  it("accepts a shared General Education course on any program version", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue(draftVersion() as never);
    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      id: COURSE_ID,
      code: "GEGS101",
      title: "General Education Foundations",
      program_id: null,
      course_scope: CourseScope.GENERAL_EDUCATION,
    } as never);
    vi.mocked(prisma.curriculumCourse.create).mockResolvedValue({ id: COURSE_ROW_ID } as never);

    const result = await addCurriculumCourse({
      curriculumVersionId: VERSION_ID,
      courseId: COURSE_ID,
      yearLevel: YearLevel.FIRST_YEAR,
      semester: AcademicSemester.FIRST,
      term: AcademicTerm.FIRST_TERM,
    });

    expect(result).toEqual({ success: true, data: { id: COURSE_ROW_ID } });
    expect(prisma.curriculumCourse.create).toHaveBeenCalled();
  });
});

describe("manage-curriculum-courses / removeCurriculumCourse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary);
    vi.mocked(prisma.$transaction).mockImplementation((callback) =>
      callback(prisma as never)
    );
  });

  it("removes a course from a DRAFT version", async () => {
    vi.mocked(prisma.curriculumCourse.findUnique).mockResolvedValue({
      id: COURSE_ROW_ID,
      curriculum_version: draftVersion(),
    } as never);
    vi.mocked(prisma.curriculumCourse.delete).mockResolvedValue({ id: COURSE_ROW_ID } as never);

    const result = await removeCurriculumCourse(COURSE_ROW_ID);

    expect(result).toEqual({ success: true, data: { id: COURSE_ROW_ID } });
    expect(prisma.curriculumCourse.delete).toHaveBeenCalledWith({ where: { id: COURSE_ROW_ID } });
  });

  it("rejects removing from a PUBLISHED version", async () => {
    vi.mocked(prisma.curriculumCourse.findUnique).mockResolvedValue({
      id: COURSE_ROW_ID,
      curriculum_version: { ...draftVersion(), status: "PUBLISHED" },
    } as never);

    const result = await removeCurriculumCourse(COURSE_ROW_ID);

    expect(result).toEqual({
      success: false,
      error: "Published curricula are immutable",
    });
    expect(prisma.curriculumCourse.delete).not.toHaveBeenCalled();
  });

  it("rejects unknown course rows", async () => {
    vi.mocked(prisma.curriculumCourse.findUnique).mockResolvedValue(null);

    const result = await removeCurriculumCourse(COURSE_ROW_ID);

    expect(result).toEqual({ success: false, error: "Curriculum course not found" });
  });
});

describe("manage-curriculum-courses / updateCurriculumCourse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary);
    vi.mocked(prisma.$transaction).mockImplementation((callback) =>
      callback(prisma as never)
    );
  });

  function courseRow(
    semester: AcademicSemester = AcademicSemester.FIRST,
    term: AcademicTerm | null = AcademicTerm.FIRST_TERM
  ) {
    return { id: COURSE_ROW_ID, semester, term, curriculum_version: draftVersion() };
  }

  it("updates placement fields on a DRAFT version without touching snapshots", async () => {
    vi.mocked(prisma.curriculumCourse.findUnique).mockResolvedValue(courseRow() as never);
    vi.mocked(prisma.curriculumCourse.update).mockResolvedValue({ id: COURSE_ROW_ID } as never);

    const result = await updateCurriculumCourse(COURSE_ROW_ID, {
      yearLevel: YearLevel.THIRD_YEAR,
      semester: AcademicSemester.SECOND,
      term: AcademicTerm.SECOND_TERM,
    });

    expect(result).toEqual({ success: true, data: { id: COURSE_ROW_ID } });
    expect(prisma.curriculumCourse.update).toHaveBeenCalledWith({
      where: { id: COURSE_ROW_ID },
      data: {
        year_level: YearLevel.THIRD_YEAR,
        semester: AcademicSemester.SECOND,
        term: AcademicTerm.SECOND_TERM,
      },
    });
  });

  it("applies partial updates", async () => {
    vi.mocked(prisma.curriculumCourse.findUnique).mockResolvedValue(courseRow() as never);
    vi.mocked(prisma.curriculumCourse.update).mockResolvedValue({ id: COURSE_ROW_ID } as never);

    const result = await updateCurriculumCourse(COURSE_ROW_ID, {
      yearLevel: YearLevel.FOURTH_YEAR,
    });

    expect(result.success).toBe(true);
    expect(prisma.curriculumCourse.update).toHaveBeenCalledWith({
      where: { id: COURSE_ROW_ID },
      data: { year_level: YearLevel.FOURTH_YEAR },
    });
  });

  it("rejects updating a course on a PUBLISHED version", async () => {
    vi.mocked(prisma.curriculumCourse.findUnique).mockResolvedValue({
      ...courseRow(),
      curriculum_version: { ...draftVersion(), status: "PUBLISHED" },
    } as never);

    const result = await updateCurriculumCourse(COURSE_ROW_ID, {
      yearLevel: YearLevel.THIRD_YEAR,
    });

    expect(result).toEqual({
      success: false,
      error: "Published curricula are immutable",
    });
    expect(prisma.curriculumCourse.update).not.toHaveBeenCalled();
  });

  it("rejects an invalid semester/term pair at the schema layer", async () => {
    const result = await updateCurriculumCourse(COURSE_ROW_ID, {
      semester: AcademicSemester.SUMMER,
      term: AcademicTerm.FIRST_TERM,
    });

    expect(result.success).toBe(false);
    expect(prisma.curriculumCourse.update).not.toHaveBeenCalled();
  });

  it("accepts a partial semester change that keeps the stored term", async () => {
    vi.mocked(prisma.curriculumCourse.findUnique).mockResolvedValue(courseRow() as never);
    vi.mocked(prisma.curriculumCourse.update).mockResolvedValue({ id: COURSE_ROW_ID } as never);

    const result = await updateCurriculumCourse(COURSE_ROW_ID, {
      semester: AcademicSemester.SECOND,
    });

    expect(result).toEqual({ success: true, data: { id: COURSE_ROW_ID } });
    expect(prisma.curriculumCourse.update).toHaveBeenCalledWith({
      where: { id: COURSE_ROW_ID },
      data: { semester: AcademicSemester.SECOND },
    });
  });

  it("rejects a term change that breaks the stored semester", async () => {
    vi.mocked(prisma.curriculumCourse.findUnique).mockResolvedValue({
      id: COURSE_ROW_ID,
      semester: AcademicSemester.SUMMER,
      term: null,
      curriculum_version: draftVersion(),
    } as never);

    const result = await updateCurriculumCourse(COURSE_ROW_ID, {
      term: AcademicTerm.FIRST_TERM,
    });

    expect(result).toEqual({
      success: false,
      error: "Summer semester cannot have a term",
    });
    expect(prisma.curriculumCourse.update).not.toHaveBeenCalled();
  });

  it("rejects a semester change that breaks the stored term", async () => {
    vi.mocked(prisma.curriculumCourse.findUnique).mockResolvedValue(courseRow() as never);

    const result = await updateCurriculumCourse(COURSE_ROW_ID, {
      semester: AcademicSemester.SUMMER,
    });

    expect(result).toEqual({
      success: false,
      error: "Summer semester cannot have a term",
    });
    expect(prisma.curriculumCourse.update).not.toHaveBeenCalled();
  });

  it("rejects a malformed course row ID before touching the database", async () => {
    const result = await removeCurriculumCourse("not-a-uuid");

    expect(result).toEqual({
      success: false,
      error: "Invalid curriculum course ID",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects an empty placement update before touching the database", async () => {
    const result = await updateCurriculumCourse(COURSE_ROW_ID, {});

    expect(result).toEqual({
      success: false,
      error: "At least one placement field is required",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("manage-curriculum-courses / duplicate placements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary);
    vi.mocked(prisma.$transaction).mockImplementation((callback) =>
      callback(prisma as never)
    );
  });

  it("allows the same Course to appear multiple times in one version", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue(draftVersion() as never);
    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      id: COURSE_ID,
      code: "IT201",
      title: "Introduction to Programming",
      program_id: PROGRAM_ID,
      course_scope: CourseScope.PROGRAM_SPECIFIC,
    } as never);
    vi.mocked(prisma.curriculumCourse.create)
      .mockResolvedValueOnce({ id: `${COURSE_ROW_ID}1` } as never)
      .mockResolvedValueOnce({ id: `${COURSE_ROW_ID}2` } as never);

    const first = await addCurriculumCourse({
      curriculumVersionId: VERSION_ID,
      courseId: COURSE_ID,
      yearLevel: YearLevel.FIRST_YEAR,
      semester: AcademicSemester.FIRST,
      term: AcademicTerm.FIRST_TERM,
    });
    const second = await addCurriculumCourse({
      curriculumVersionId: VERSION_ID,
      courseId: COURSE_ID,
      yearLevel: YearLevel.SECOND_YEAR,
      semester: AcademicSemester.SUMMER,
      term: null,
    });

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(prisma.curriculumCourse.create).toHaveBeenCalledTimes(2);
  });
});
