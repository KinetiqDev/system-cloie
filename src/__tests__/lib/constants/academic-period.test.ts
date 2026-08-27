import { describe, it, expect } from "vitest";
import {
  ALLOWED_SEMESTER_TERM_PAIRS,
  CANONICAL_TERMS,
  formatSchoolYearCode,
  parseSchoolYearCode,
  assertValidSemesterTerm,
  isValidSemesterTerm,
  getSemesterTermLabel,
  getSemesterShortLabel,
  getTermShortLabel,
  normalizeFriendlyInput,
  parseSemesterInput,
  parseTermInput,
} from "@/lib/constants/academic-period";
import { AcademicSemester, AcademicTerm } from "@prisma/client";

describe("academic-period constants", () => {
  describe("formatSchoolYearCode", () => {
    it("should format start year correctly", () => {
      expect(formatSchoolYearCode(2025)).toBe("2025-2026");
      expect(formatSchoolYearCode(2024)).toBe("2024-2025");
      expect(formatSchoolYearCode(2000)).toBe("2000-2001");
    });
  });

  describe("parseSchoolYearCode", () => {
    it("should parse valid codes correctly", () => {
      expect(parseSchoolYearCode("2025-2026")).toEqual({
        startYear: 2025,
        endYear: 2026,
      });
      expect(parseSchoolYearCode("2024-2025")).toEqual({
        startYear: 2024,
        endYear: 2025,
      });
    });

    it("should return null for invalid formats", () => {
      expect(parseSchoolYearCode("2025")).toBeNull();
      expect(parseSchoolYearCode("2025-2027")).toBeNull(); // Not consecutive
      expect(parseSchoolYearCode("invalid")).toBeNull();
    });
  });

  describe("assertValidSemesterTerm", () => {
    it("should validate SUMMER with null term", () => {
      expect(assertValidSemesterTerm(AcademicSemester.SUMMER, null).valid).toBe(true);
      expect(assertValidSemesterTerm(AcademicSemester.SUMMER, undefined).valid).toBe(true);
    });

    it("should reject SUMMER with a term", () => {
      const result = assertValidSemesterTerm(AcademicSemester.SUMMER, AcademicTerm.FIRST_TERM);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe("Summer semester cannot have a term");
      }
    });

    it("should validate FIRST and SECOND with terms", () => {
      expect(assertValidSemesterTerm(AcademicSemester.FIRST, AcademicTerm.FIRST_TERM).valid).toBe(
        true
      );
      expect(assertValidSemesterTerm(AcademicSemester.FIRST, AcademicTerm.SECOND_TERM).valid).toBe(
        true
      );
      expect(assertValidSemesterTerm(AcademicSemester.SECOND, AcademicTerm.FIRST_TERM).valid).toBe(
        true
      );
      expect(assertValidSemesterTerm(AcademicSemester.SECOND, AcademicTerm.SECOND_TERM).valid).toBe(
        true
      );
    });

    it("should reject FIRST and SECOND without terms", () => {
      const result1 = assertValidSemesterTerm(AcademicSemester.FIRST, null);
      expect(result1.valid).toBe(false);
      if (!result1.valid) {
        expect(result1.error).toBe("First and Second semesters must have a term");
      }

      const result2 = assertValidSemesterTerm(AcademicSemester.SECOND, undefined);
      expect(result2.valid).toBe(false);
      if (!result2.valid) {
        expect(result2.error).toBe("First and Second semesters must have a term");
      }
    });
  });

  describe("isValidSemesterTerm", () => {
    it("should return true for valid combinations", () => {
      expect(isValidSemesterTerm(AcademicSemester.SUMMER, null)).toBe(true);
      expect(isValidSemesterTerm(AcademicSemester.FIRST, AcademicTerm.FIRST_TERM)).toBe(true);
    });

    it("should return false for invalid combinations", () => {
      expect(isValidSemesterTerm(AcademicSemester.SUMMER, AcademicTerm.FIRST_TERM)).toBe(false);
      expect(isValidSemesterTerm(AcademicSemester.FIRST, null)).toBe(false);
    });
  });

  describe("getSemesterTermLabel", () => {
    it("should return correct labels", () => {
      expect(getSemesterTermLabel(AcademicSemester.FIRST, AcademicTerm.FIRST_TERM)).toBe(
        "1st Semester — 1st Term"
      );
      expect(getSemesterTermLabel(AcademicSemester.SECOND, AcademicTerm.SECOND_TERM)).toBe(
        "2nd Semester — 2nd Term"
      );
      expect(getSemesterTermLabel(AcademicSemester.SUMMER, null)).toBe("Summer");
    });

    it("should return 'Unknown' for invalid combinations", () => {
      expect(getSemesterTermLabel(AcademicSemester.FIRST, null)).toBe("Unknown");
      expect(getSemesterTermLabel(AcademicSemester.SUMMER, AcademicTerm.FIRST_TERM)).toBe(
        "Unknown"
      );
    });
  });

  describe("getSemesterShortLabel", () => {
    it("should return short labels", () => {
      expect(getSemesterShortLabel(AcademicSemester.FIRST)).toBe("1st Sem");
      expect(getSemesterShortLabel(AcademicSemester.SECOND)).toBe("2nd Sem");
      expect(getSemesterShortLabel(AcademicSemester.SUMMER)).toBe("Summer");
    });
  });

  describe("getTermShortLabel", () => {
    it("should return short labels", () => {
      expect(getTermShortLabel(AcademicTerm.FIRST_TERM)).toBe("1st Term");
      expect(getTermShortLabel(AcademicTerm.SECOND_TERM)).toBe("2nd Term");
      expect(getTermShortLabel(null)).toBe("");
      expect(getTermShortLabel(undefined)).toBe("");
    });
  });

  describe("CANONICAL_TERMS", () => {
    it("defines exactly the 5 fixed periods of a school year", () => {
      expect(CANONICAL_TERMS).toHaveLength(5);
      expect(CANONICAL_TERMS).toEqual([
        {
          semester: AcademicSemester.FIRST,
          term: AcademicTerm.FIRST_TERM,
          label: expect.any(String),
        },
        {
          semester: AcademicSemester.FIRST,
          term: AcademicTerm.SECOND_TERM,
          label: expect.any(String),
        },
        {
          semester: AcademicSemester.SECOND,
          term: AcademicTerm.FIRST_TERM,
          label: expect.any(String),
        },
        {
          semester: AcademicSemester.SECOND,
          term: AcademicTerm.SECOND_TERM,
          label: expect.any(String),
        },
        { semester: AcademicSemester.SUMMER, term: null, label: expect.any(String) },
      ]);
    });

    it("is the single source for the allowed semester-term pairs", () => {
      expect(ALLOWED_SEMESTER_TERM_PAIRS).toBe(CANONICAL_TERMS);
    });
  });

  describe("ALLOWED_SEMESTER_TERM_PAIRS", () => {
    it("should contain exactly 5 valid pairs", () => {
      expect(ALLOWED_SEMESTER_TERM_PAIRS).toHaveLength(5);
    });

    it("should include all expected combinations", () => {
      const pairs = ALLOWED_SEMESTER_TERM_PAIRS;

      // First semester with both terms
      expect(
        pairs.some(
          (p) => p.semester === AcademicSemester.FIRST && p.term === AcademicTerm.FIRST_TERM
        )
      ).toBe(true);
      expect(
        pairs.some(
          (p) => p.semester === AcademicSemester.FIRST && p.term === AcademicTerm.SECOND_TERM
        )
      ).toBe(true);

      // Second semester with both terms
      expect(
        pairs.some(
          (p) => p.semester === AcademicSemester.SECOND && p.term === AcademicTerm.FIRST_TERM
        )
      ).toBe(true);
      expect(
        pairs.some(
          (p) => p.semester === AcademicSemester.SECOND && p.term === AcademicTerm.SECOND_TERM
        )
      ).toBe(true);

      // Summer with null term
      expect(pairs.some((p) => p.semester === AcademicSemester.SUMMER && p.term === null)).toBe(
        true
      );
    });
  });

  describe("normalizeFriendlyInput", () => {
    it("strips non-alphanumerics, lowercases, trims, and normalizes", () => {
      expect(normalizeFriendlyInput("1st Semester")).toBe("1stsemester");
      expect(normalizeFriendlyInput("FIRST_TERM")).toBe("firstterm");
      expect(normalizeFriendlyInput("  Program  Wide  ")).toBe("programwide");
      expect(normalizeFriendlyInput("")).toBe("");
      expect(normalizeFriendlyInput(null)).toBe("");
      expect(normalizeFriendlyInput(undefined)).toBe("");
    });
  });

  describe("parseSemesterInput", () => {
    it("accepts friendly numbers", () => {
      expect(parseSemesterInput("1")).toEqual({ ok: true, value: AcademicSemester.FIRST });
      expect(parseSemesterInput("2")).toEqual({ ok: true, value: AcademicSemester.SECOND });
      expect(parseSemesterInput("3")).toEqual({ ok: true, value: AcademicSemester.SUMMER });
    });

    it("accepts ordinal and word forms", () => {
      expect(parseSemesterInput("1st")).toEqual({ ok: true, value: AcademicSemester.FIRST });
      expect(parseSemesterInput("1st Semester")).toEqual({
        ok: true,
        value: AcademicSemester.FIRST,
      });
      expect(parseSemesterInput("first")).toEqual({ ok: true, value: AcademicSemester.FIRST });
      expect(parseSemesterInput("Summer")).toEqual({ ok: true, value: AcademicSemester.SUMMER });
    });

    it("accepts exact enum values for backward compatibility", () => {
      expect(parseSemesterInput("FIRST")).toEqual({ ok: true, value: AcademicSemester.FIRST });
      expect(parseSemesterInput("SECOND")).toEqual({ ok: true, value: AcademicSemester.SECOND });
      expect(parseSemesterInput("SUMMER")).toEqual({ ok: true, value: AcademicSemester.SUMMER });
    });

    it("returns null for blank input", () => {
      expect(parseSemesterInput("")).toEqual({ ok: true, value: null });
      expect(parseSemesterInput(null)).toEqual({ ok: true, value: null });
      expect(parseSemesterInput(undefined)).toEqual({ ok: true, value: null });
    });

    it("returns a friendly error for unrecognized values", () => {
      const result = parseSemesterInput("Fall");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("1, 2, or 3");
    });
  });

  describe("parseTermInput", () => {
    it("accepts friendly numbers", () => {
      expect(parseTermInput("1")).toEqual({ ok: true, value: AcademicTerm.FIRST_TERM });
      expect(parseTermInput("2")).toEqual({ ok: true, value: AcademicTerm.SECOND_TERM });
    });

    it("accepts ordinal and word forms", () => {
      expect(parseTermInput("1st")).toEqual({ ok: true, value: AcademicTerm.FIRST_TERM });
      expect(parseTermInput("1st Term")).toEqual({ ok: true, value: AcademicTerm.FIRST_TERM });
      expect(parseTermInput("first term")).toEqual({ ok: true, value: AcademicTerm.FIRST_TERM });
    });

    it("accepts exact enum values for backward compatibility", () => {
      expect(parseTermInput("FIRST_TERM")).toEqual({ ok: true, value: AcademicTerm.FIRST_TERM });
      expect(parseTermInput("SECOND_TERM")).toEqual({ ok: true, value: AcademicTerm.SECOND_TERM });
    });

    it("returns null for blank input", () => {
      expect(parseTermInput("")).toEqual({ ok: true, value: null });
      expect(parseTermInput(null)).toEqual({ ok: true, value: null });
    });

    it("returns a friendly error for unrecognized values", () => {
      const result = parseTermInput("Midterm");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("1 or 2");
    });
  });
});
