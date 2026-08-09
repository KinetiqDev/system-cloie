import { describe, expect, it } from "vitest";
import { AcademicSemester, AcademicTerm, YearLevel } from "@prisma/client";
import {
  addCurriculumCourseSchema,
  createCurriculumVersionSchema,
  updateCurriculumCourseSchema,
} from "@/features/curriculum/schemas/curriculum";

const UUID = "00000000-0000-4000-8000-000000000000";

function courseInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    curriculumVersionId: UUID,
    courseId: UUID,
    yearLevel: YearLevel.FIRST_YEAR,
    semester: AcademicSemester.FIRST,
    term: AcademicTerm.FIRST_TERM,
    ...overrides,
  };
}

describe("addCurriculumCourseSchema semester/term validation", () => {
  it("accepts SUMMER with null term", () => {
    const result = addCurriculumCourseSchema.safeParse(
      courseInput({ semester: AcademicSemester.SUMMER, term: null })
    );
    expect(result.success).toBe(true);
  });

  it("accepts SUMMER with term omitted", () => {
    const result = addCurriculumCourseSchema.safeParse(
      courseInput({ semester: AcademicSemester.SUMMER, term: undefined })
    );
    expect(result.success).toBe(true);
  });

  it("rejects SUMMER with a non-null term", () => {
    const result = addCurriculumCourseSchema.safeParse(
      courseInput({ semester: AcademicSemester.SUMMER, term: AcademicTerm.FIRST_TERM })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("term"))).toBe(true);
    }
  });

  it("accepts FIRST/SECOND with a non-null term", () => {
    const first = addCurriculumCourseSchema.safeParse(
      courseInput({ semester: AcademicSemester.FIRST, term: AcademicTerm.SECOND_TERM })
    );
    const second = addCurriculumCourseSchema.safeParse(
      courseInput({ semester: AcademicSemester.SECOND, term: AcademicTerm.FIRST_TERM })
    );
    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
  });

  it("rejects FIRST/SECOND with null term", () => {
    const result = addCurriculumCourseSchema.safeParse(
      courseInput({ semester: AcademicSemester.FIRST, term: null })
    );
    expect(result.success).toBe(false);
  });

  it("rejects FIRST/SECOND with term omitted", () => {
    const result = addCurriculumCourseSchema.safeParse(
      courseInput({ semester: AcademicSemester.SECOND, term: undefined })
    );
    expect(result.success).toBe(false);
  });
});

describe("updateCurriculumCourseSchema semester/term validation", () => {
  it("accepts placement-only updates without semester", () => {
    const result = updateCurriculumCourseSchema.safeParse({
      id: UUID,
      yearLevel: YearLevel.THIRD_YEAR,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid semester/term pair", () => {
    const result = updateCurriculumCourseSchema.safeParse({
      id: UUID,
      semester: AcademicSemester.SUMMER,
      term: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid semester/term pair", () => {
    const result = updateCurriculumCourseSchema.safeParse({
      id: UUID,
      semester: AcademicSemester.SUMMER,
      term: AcademicTerm.FIRST_TERM,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID ids", () => {
    const result = updateCurriculumCourseSchema.safeParse({
      id: "not-a-uuid",
      semester: AcademicSemester.SUMMER,
    });
    expect(result.success).toBe(false);
  });
});

describe("createCurriculumVersionSchema", () => {
  it("accepts a minimal valid input", () => {
    const result = createCurriculumVersionSchema.safeParse({
      programId: UUID,
      code: "BSIT-2030",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an optional major and name", () => {
    const result = createCurriculumVersionSchema.safeParse({
      programId: UUID,
      majorId: UUID,
      code: "BSIT-2030",
      name: "BSIT 2030 Curriculum",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty code", () => {
    const result = createCurriculumVersionSchema.safeParse({ programId: UUID, code: "  " });
    expect(result.success).toBe(false);
  });
});
