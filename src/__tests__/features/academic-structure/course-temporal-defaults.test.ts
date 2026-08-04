import { describe, it, expect } from "vitest";
import { createCourseSchema, updateCourseSchema } from "@/features/academic-structure/schemas/course";
import { AcademicSemester, AcademicTerm, CourseScope, YearLevel } from "@prisma/client";

describe("Course temporal defaults schema", () => {
  const baseCourseData = {
    code: "TEST101",
    title: "Test Course",
    course_scope: CourseScope.GENERAL_EDUCATION,
    program_id: undefined,
    major_id: undefined,
    description: undefined,
  };

  describe("valid semester-term pairs are accepted", () => {
    it("should accept FIRST semester with FIRST_TERM", () => {
      const result = createCourseSchema.safeParse({
        ...baseCourseData,
        default_semester: AcademicSemester.FIRST,
        default_term: AcademicTerm.FIRST_TERM,
        default_year_level: YearLevel.FIRST_YEAR,
      });

      expect(result.success).toBe(true);
    });

    it("should accept FIRST semester with SECOND_TERM", () => {
      const result = createCourseSchema.safeParse({
        ...baseCourseData,
        default_semester: AcademicSemester.FIRST,
        default_term: AcademicTerm.SECOND_TERM,
        default_year_level: YearLevel.FIRST_YEAR,
      });

      expect(result.success).toBe(true);
    });

    it("should accept SECOND semester with FIRST_TERM", () => {
      const result = createCourseSchema.safeParse({
        ...baseCourseData,
        default_semester: AcademicSemester.SECOND,
        default_term: AcademicTerm.FIRST_TERM,
        default_year_level: YearLevel.SECOND_YEAR,
      });

      expect(result.success).toBe(true);
    });

    it("should accept SECOND semester with SECOND_TERM", () => {
      const result = createCourseSchema.safeParse({
        ...baseCourseData,
        default_semester: AcademicSemester.SECOND,
        default_term: AcademicTerm.SECOND_TERM,
        default_year_level: YearLevel.SECOND_YEAR,
      });

      expect(result.success).toBe(true);
    });

    it("should accept SUMMER semester with null term", () => {
      const result = createCourseSchema.safeParse({
        ...baseCourseData,
        default_semester: AcademicSemester.SUMMER,
        default_term: null,
        default_year_level: YearLevel.THIRD_YEAR,
      });

      expect(result.success).toBe(true);
    });

    it("should accept all null defaults (legacy course)", () => {
      const result = createCourseSchema.safeParse({
        ...baseCourseData,
        default_semester: undefined,
        default_term: undefined,
        default_year_level: undefined,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("invalid semester-term pairs are rejected", () => {
    it("should reject SUMMER semester with FIRST_TERM", () => {
      const result = createCourseSchema.safeParse({
        ...baseCourseData,
        default_semester: AcademicSemester.SUMMER,
        default_term: AcademicTerm.FIRST_TERM,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const hasSummerError = result.error.issues.some((issue) => issue.message.includes("Summer"));
        expect(hasSummerError).toBe(true);
      }
    });

    it("should reject SUMMER semester with SECOND_TERM", () => {
      const result = createCourseSchema.safeParse({
        ...baseCourseData,
        default_semester: AcademicSemester.SUMMER,
        default_term: AcademicTerm.SECOND_TERM,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const hasSummerError = result.error.issues.some((issue) => issue.message.includes("Summer"));
        expect(hasSummerError).toBe(true);
      }
    });

    it("should reject FIRST semester with null term", () => {
      const result = createCourseSchema.safeParse({
        ...baseCourseData,
        default_semester: AcademicSemester.FIRST,
        default_term: null,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const hasTermError = result.error.issues.some((issue) => issue.message.includes("term"));
        expect(hasTermError).toBe(true);
      }
    });

    it("should reject SECOND semester with null term", () => {
      const result = createCourseSchema.safeParse({
        ...baseCourseData,
        default_semester: AcademicSemester.SECOND,
        default_term: null,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const hasTermError = result.error.issues.some((issue) => issue.message.includes("term"));
        expect(hasTermError).toBe(true);
      }
    });

    it("should reject term when semester is undefined", () => {
      const result = createCourseSchema.safeParse({
        ...baseCourseData,
        default_semester: undefined,
        default_term: AcademicTerm.FIRST_TERM,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const hasSemesterError = result.error.issues.some((issue) => issue.message.includes("Semester must be set"));
        expect(hasSemesterError).toBe(true);
      }
    });
  });

  describe("course_scope enum rejection", () => {
    it("should reject MAJOR_SPECIFIC value (legacy enum removed)", () => {
      const result = createCourseSchema.safeParse({
        ...baseCourseData,
        course_scope: "MAJOR_SPECIFIC" as unknown as CourseScope,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const hasEnumError = result.error.issues.some((issue) =>
          issue.message.includes("Invalid option")
        );
        expect(hasEnumError).toBe(true);
      }
    });

    it("should reject MAJOR_SPECIFIC value on update (legacy enum removed)", () => {
      const result = updateCourseSchema.safeParse({
        id: "12345678-1234-4234-8234-123456789012",
        ...baseCourseData,
        course_scope: "MAJOR_SPECIFIC" as unknown as CourseScope,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const hasEnumError = result.error.issues.some((issue) =>
          issue.message.includes("Invalid option")
        );
        expect(hasEnumError).toBe(true);
      }
    });
  });

  describe("update schema validates temporal defaults", () => {
    it("should accept valid semester-term pair on update", () => {
      const result = updateCourseSchema.safeParse({
        id: "12345678-1234-4234-8234-123456789012",
        code: "TEST101",
        title: "Test Course",
        course_scope: CourseScope.GENERAL_EDUCATION,
        program_id: undefined,
        major_id: undefined,
        description: undefined,
        default_semester: AcademicSemester.FIRST,
        default_term: AcademicTerm.FIRST_TERM,
        default_year_level: YearLevel.FIRST_YEAR,
      });

      expect(result.success).toBe(true);
    });

    it("should reject invalid semester-term pair on update", () => {
      const result = updateCourseSchema.safeParse({
        id: "12345678-1234-4234-8234-123456789012",
        code: "TEST101",
        title: "Test Course",
        course_scope: CourseScope.GENERAL_EDUCATION,
        program_id: undefined,
        major_id: undefined,
        description: undefined,
        default_semester: AcademicSemester.SUMMER,
        default_term: AcademicTerm.FIRST_TERM,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const hasSummerError = result.error.issues.some((issue) => issue.message.includes("Summer"));
        expect(hasSummerError).toBe(true);
      }
    });
  });
});

import { createProgramHeadCourseSchema } from "@/features/academic-structure/schemas/program-head-course";

describe("Program Head Course Schema", () => {
  const basePHCourseData = {
    programId: "11111111-1111-4111-8111-111111111111",
    course_type: "program-wide",
    code: "TESTPH1",
    title: "PH Course",
    course_scope: CourseScope.PROGRAM_SPECIFIC,
    major_id: undefined,
    description: undefined,
  };

  it("should accept PROGRAM_SPECIFIC scope", () => {
    const result = createProgramHeadCourseSchema.safeParse(basePHCourseData);
    expect(result.success).toBe(true);
  });

  it("should reject GENERAL_EDUCATION scope", () => {
    const result = createProgramHeadCourseSchema.safeParse({
      ...basePHCourseData,
      course_scope: CourseScope.GENERAL_EDUCATION,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const hasScopeError = result.error.issues.some((issue) =>
        issue.message.includes("only create program-specific")
      );
      expect(hasScopeError).toBe(true);
    }
  });

  it("requires a major for a major-specific Course", () => {
    const result = createProgramHeadCourseSchema.safeParse({
      ...basePHCourseData,
      course_type: "major-specific",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes("Select a major"))).toBe(
        true
      );
    }
  });
});
