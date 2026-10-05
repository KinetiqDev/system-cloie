import { describe, expect, it } from "vitest";
import {
  canArchiveSchoolYear,
  canActivateSchoolYear,
  canDeactivateSchoolYear,
  canSetActiveSemester,
} from "@/features/academic-calendar/policies";
import { AcademicSemester } from "@prisma/client";

describe("academic-calendar/policies", () => {
  describe("canArchiveSchoolYear", () => {
    it("allows archiving when no active term in school year", () => {
      const result = canArchiveSchoolYear("sy-1", "ti-other", false, ["ti-1", "ti-2"]);
      expect(result.allowed).toBe(true);
    });

    it("prevents archiving if already archived", () => {
      const result = canArchiveSchoolYear("sy-1", null, true, ["ti-1"]);
      expect(result.allowed).toBe(false);
      expect((result as { allowed: false; reason: string }).reason).toBe(
        "School year is already archived"
      );
    });

    it("prevents archiving if contains active term", () => {
      const result = canArchiveSchoolYear("sy-1", "ti-active", false, ["ti-1", "ti-active"]);
      expect(result.allowed).toBe(false);
      expect((result as { allowed: false; reason: string }).reason).toContain("active term");
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
      expect((result as { allowed: false; reason: string }).reason).toBe(
        "School year is already active"
      );
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
      expect((result as { allowed: false; reason: string }).reason).toBe(
        "School year is not active"
      );
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
      expect((result as { allowed: false; reason: string }).reason).toContain(
        "Activate the school year"
      );
    });

    it("prevents setting a null semester", () => {
      const result = canSetActiveSemester(true, null);
      expect(result.allowed).toBe(false);
      expect((result as { allowed: false; reason: string }).reason).toBe("A semester is required");
    });
  });
});
