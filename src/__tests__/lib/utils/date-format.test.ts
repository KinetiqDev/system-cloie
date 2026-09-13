import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateRange,
  formatDateTime,
  formatSchoolYearRange,
  formatTermInstanceLabel,
  formatTermInstanceCompact,
  formatTermInstanceShort,
} from "@/lib/utils/date-format";
import { AcademicSemester, AcademicTerm } from "@prisma/client";

describe("date-format", () => {
  describe("formatDate", () => {
    // The same moment must read identically on the server and in the browser,
    // so the rendered calendar day comes from the institution's time zone and
    // not from whichever time zone the process or device runs in.
    it("renders the institution's calendar day for a UTC instant", () => {
      expect(formatDate(new Date("2026-09-10T18:10:06.000Z"))).toBe("Sep 11, 2026");
    });
  });

  describe("formatDateTime", () => {
    it("renders the institution's date and time for a UTC instant", () => {
      expect(formatDateTime(new Date("2026-09-12T16:37:50.000Z"))).toBe("Sep 13, 2026, 12:37 AM");
    });
  });

  describe("formatDateRange", () => {
    it("formats date range with both dates", () => {
      const start = new Date("2025-08-01");
      const end = new Date("2026-05-31");
      const result = formatDateRange(start, end);
      expect(result).toContain("Aug");
      expect(result).toContain("2025");
      expect(result).toContain("May");
      expect(result).toContain("2026");
      expect(result).toContain("–");
    });

    it("handles null start date", () => {
      const end = new Date("2026-05-31");
      const result = formatDateRange(null, end);
      expect(result).toContain("?");
      expect(result).toContain("May");
    });

    it("handles null end date", () => {
      const start = new Date("2025-08-01");
      const result = formatDateRange(start, null);
      expect(result).toContain("Aug");
      expect(result).toContain("?");
    });

    it("handles both null dates", () => {
      const result = formatDateRange(null, null);
      expect(result).toBe("No dates set");
    });
  });

  describe("formatSchoolYearRange", () => {
    it("formats school year range", () => {
      expect(formatSchoolYearRange(2025, 2026)).toBe("2025-2026");
      expect(formatSchoolYearRange(2024, 2025)).toBe("2024-2025");
    });
  });

  describe("formatTermInstanceLabel", () => {
    it("formats full label with term", () => {
      const result = formatTermInstanceLabel(
        "2025-2026",
        AcademicSemester.FIRST,
        AcademicTerm.FIRST_TERM
      );
      expect(result).toBe("2025-2026 — 1st Semester — 1st Term");
    });

    it("formats full label without term (Summer)", () => {
      const result = formatTermInstanceLabel("2025-2026", AcademicSemester.SUMMER, null);
      expect(result).toBe("2025-2026 — Summer");
    });
  });

  describe("formatTermInstanceCompact", () => {
    it("formats compact label with term", () => {
      const result = formatTermInstanceCompact(
        "2025-2026",
        AcademicSemester.FIRST,
        AcademicTerm.FIRST_TERM
      );
      expect(result).toBe("2025-2026 | 1st Sem — 1st Term");
    });

    it("formats compact label without term", () => {
      const result = formatTermInstanceCompact("2025-2026", AcademicSemester.SECOND, null);
      expect(result).toBe("2025-2026 | 2nd Sem");
    });
  });

  describe("formatTermInstanceShort", () => {
    it("formats short label for first semester", () => {
      const result = formatTermInstanceShort("2025-2026", AcademicSemester.FIRST);
      expect(result).toBe("25-26 1st Sem");
    });

    it("formats short label for second semester", () => {
      const result = formatTermInstanceShort("2025-2026", AcademicSemester.SECOND);
      expect(result).toBe("25-26 2nd Sem");
    });

    it("formats short label for summer", () => {
      const result = formatTermInstanceShort("2025-2026", AcademicSemester.SUMMER);
      expect(result).toBe("25-26 Summer");
    });
  });
});
