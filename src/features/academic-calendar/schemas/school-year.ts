import { z } from "zod";
import { formatSchoolYearCode, parseSchoolYearCode } from "@/lib/constants/academic-period";

/**
 * Zod schema for creating a School Year.
 */
export const createSchoolYearSchema = z.object({
  startYear: z
    .number()
    .int()
    .min(2000, "Start year must be 2000 or later")
    .max(2100, "Start year must be 2100 or earlier"),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate < data.endDate;
    }
    return true;
  },
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
);

export type CreateSchoolYearInput = z.infer<typeof createSchoolYearSchema>;

/**
 * Zod schema for updating a School Year.
 */
export const updateSchoolYearSchema = z.object({
  id: z.string().uuid("Invalid school year ID"),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate < data.endDate;
    }
    return true;
  },
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
);

export type UpdateSchoolYearInput = z.infer<typeof updateSchoolYearSchema>;

/**
 * Zod schema for archiving a School Year.
 */
export const archiveSchoolYearSchema = z.object({
  id: z.string().uuid("Invalid school year ID"),
});

export type ArchiveSchoolYearInput = z.infer<typeof archiveSchoolYearSchema>;

/**
 * Zod schema for setting the active semester of a School Year.
 */
export const setActiveSemesterSchema = z.object({
  schoolYearId: z.string().uuid("Invalid school year ID"),
  semester: z.enum(["FIRST", "SECOND", "SUMMER"], {
    message: "Semester must be FIRST, SECOND, or SUMMER",
  }),
});

/**
 * Derive the school year code from a start year.
 */
export function deriveSchoolYearCode(startYear: number): string {
  return formatSchoolYearCode(startYear);
}

/**
 * Validate a school year code.
 */
export function validateSchoolYearCode(code: string): boolean {
  return parseSchoolYearCode(code) !== null;
}
