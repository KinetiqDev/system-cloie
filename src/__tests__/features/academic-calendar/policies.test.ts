import { describe, expect, it } from "vitest";
import {
  canArchiveSchoolYear,
  canActivateSchoolYear,
  canDeactivateSchoolYear,
  canSetActiveSemester,
  canSetActiveTerm,
  canDeleteTermInstance,
  canDeleteSchoolYear,
  isStructuralTerm,
} from "@/features/academic-calendar/policies";
import { AcademicSemester, AcademicTerm } from "@prisma/client";

describe("academic-calendar/policies", () => {
  describe("isStructuralTerm", () => {
    it("returns true for all 5 canonical terms", () => {
      expect(isStructuralTerm({ semester: AcademicSemester.FIRST, term: AcademicTerm.FIRST_TERM })).toBe(true);
      expect(isStructuralTerm({ semester: AcademicSemester.FIRST, term: AcademicTerm.SECOND_TERM })).toBe(true);
      expect(isStructuralTerm({ semester: AcademicSemester.SECOND, term: AcademicTerm.FIRST_TERM })).toBe(true);
      expect(isStructuralTerm({ semester: AcademicSemester.SECOND, term: AcademicTerm.SECOND_TERM })).toBe(true);
      expect(isStructuralTerm({ semester: AcademicSemester.SUMMER, term: null })).toBe(true);
    });

    it("returns false for legacy non-canonical terms", () => {
      expect(isStructuralTerm({ semester: AcademicSemester.FIRST, term: null })).toBe(false);
      expect(isStructuralTerm({ semester: AcademicSemester.SUMMER, term: AcademicTerm.FIRST_TERM })).toBe(false);
      expect(isStructuralTerm({ semester: "SECOND", term: "THIRD_TERM" } as never)).toBe(false);
    });
  });

  describe("canArchiveSchoolYear", () => {
    it("allows archiving when no active term in school year", () => {
      const result = canArchiveSchoolYear("sy-1", "ti-other", false, ["ti-1", "ti-2"]);
      expect(result.allowed).toBe(true);
    });

    it("prevents archiving if already archived", () => {
      const result = canArchiveSchoolYear("sy-1", null, true, ["ti-1"]);
      expect(result.allowed).toBe(false);
      expect((result as { allowed: false; reason: string }).reason).toBe("School year is already archived");
    });

    it("prevents archiving if contains active term", () => {
      const result = canArchiveSchoolYear("sy-1", "ti-active", false, ["ti-1", "ti-active"]);
      expect(result.allowed).toBe(false);
      expect((result as { allowed: false; reason: string }).reason).toContain("active term");
    });
  });

  describe("canSetActiveTerm", () => {
    it("allows setting active when term is not already active", () => {
      const result = canSetActiveTerm(
        "ti-new",
        "ti-current",
        AcademicSemester.FIRST,
        AcademicTerm.FIRST_TERM
      );
      expect(result.allowed).toBe(true);
    });

    it("prevents setting active if term is already active", () => {
      const result = canSetActiveTerm(
        "ti-current",
        "ti-current",
        AcademicSemester.FIRST,
        AcademicTerm.FIRST_TERM
      );
      expect(result.allowed).toBe(false);
      expect((result as { allowed: false; reason: string }).reason).toBe("Term is already active");
    });

    it("prevents setting active with invalid semester-term combination", () => {
      const result = canSetActiveTerm(
        "ti-new",
        null,
        AcademicSemester.SUMMER,
        AcademicTerm.FIRST_TERM // Invalid: Summer should not have a term
      );
      expect(result.allowed).toBe(false);
      expect((result as { allowed: false; reason: string }).reason).toBe("Invalid semester-term combination");
    });

    it("allows Summer semester with null term", () => {
      const result = canSetActiveTerm("ti-new", null, AcademicSemester.SUMMER, null);
      expect(result.allowed).toBe(true);
    });
  });

  describe("canDeleteTermInstance", () => {
    it("allows deletion when not active and no dependents", () => {
      const result = canDeleteTermInstance("ti-1", "ti-other", false);
      expect(result.allowed).toBe(true);
    });

    it("prevents deletion of active term", () => {
      const result = canDeleteTermInstance("ti-active", "ti-active", false);
      expect(result.allowed).toBe(false);
      expect((result as { allowed: false; reason: string }).reason).toContain("active term");
    });

    it("prevents deletion when has dependent records", () => {
      const result = canDeleteTermInstance("ti-1", "ti-other", true);
      expect(result.allowed).toBe(false);
      expect((result as { allowed: false; reason: string }).reason).toContain("enrollments or deployments");
    });
  });

  describe("canDeleteSchoolYear", () => {
    it("allows deletion when archived and no dependents", () => {
      const result = canDeleteSchoolYear(true, false);
      expect(result.allowed).toBe(true);
    });

    it("prevents deletion if not archived", () => {
      const result = canDeleteSchoolYear(false, false);
      expect(result.allowed).toBe(false);
      expect((result as { allowed: false; reason: string }).reason).toContain("Must archive");
    });

    it("prevents deletion if has dependent records", () => {
      const result = canDeleteSchoolYear(true, true);
      expect(result.allowed).toBe(false);
      expect((result as { allowed: false; reason: string }).reason).toContain("existing enrollments");
    });
  });

  describe("canActivateSchoolYear", () => {
    it("allows activation when inactive and active semester is set", () => {
      const result = canActivateSchoolYear(false, AcademicSemester.FIRST);
      expect(result.allowed).toBe(true);
    });

    it("prevents activation when already active", () => {
      const result = canActivateSchoolYear(true, AcademicSemester.FIRST);
      expect(result.allowed).toBe(false);
      expect((result as { allowed: false; reason: string }).reason).toBe("School year is already active");
    });

    it("prevents activation when active semester is null", () => {
      const result = canActivateSchoolYear(false, null);
      expect(result.allowed).toBe(false);
      expect((result as { allowed: false; reason: string }).reason).toContain("active semester");
    });
  });

  describe("canDeactivateSchoolYear", () => {
    it("allows deactivation when active with no active period", () => {
      const result = canDeactivateSchoolYear(true, false);
      expect(result.allowed).toBe(true);
    });

    it("prevents deactivation when not active", () => {
      const result = canDeactivateSchoolYear(false, false);
      expect(result.allowed).toBe(false);
      expect((result as { allowed: false; reason: string }).reason).toBe("School year is not active");
    });

    it("prevents deactivation when it contains an active period", () => {
      const result = canDeactivateSchoolYear(true, true);
      expect(result.allowed).toBe(false);
      expect((result as { allowed: false; reason: string }).reason).toContain("active period");
    });
  });

  describe("canSetActiveSemester", () => {
    it("allows setting a semester on an active school year", () => {
      const result = canSetActiveSemester(true, AcademicSemester.SUMMER);
      expect(result.allowed).toBe(true);
    });

    it("prevents setting a semester on an inactive school year", () => {
      const result = canSetActiveSemester(false, AcademicSemester.FIRST);
      expect(result.allowed).toBe(false);
      expect((result as { allowed: false; reason: string }).reason).toContain("Activate the school year");
    });

    it("prevents setting a null semester", () => {
      const result = canSetActiveSemester(true, null);
      expect(result.allowed).toBe(false);
      expect((result as { allowed: false; reason: string }).reason).toBe("A semester is required");
    });
  });
});
