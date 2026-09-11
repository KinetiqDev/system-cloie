import { z } from "zod";

/** Year of the current commencement cycle; nobody has graduated beyond it yet. */
const CURRENT_YEAR = new Date().getFullYear();

/**
 * The college department closed after 1978 and reopened in 1998, graduating its
 * first modern batch in 2000: no college degree was awarded in these years.
 */
const HIATUS_START = 1979;
const HIATUS_END = 1999;

/**
 * Eras in which ACD awarded college degrees. The gap between them is a real
 * domain fact, so the picker and the validator both work from ranges rather
 * than one continuous span.
 */
export const ALUMNI_GRADUATION_YEAR_RANGES: readonly { start: number; end: number }[] = [
  { start: 1963, end: HIATUS_START - 1 },
  { start: HIATUS_END + 1, end: CURRENT_YEAR },
];

export const ALUMNI_GRADUATION_HIATUS_NOTE = `No ACD college graduations from ${HIATUS_START} to ${HIATUS_END}.`;

/**
 * Explains why a graduation year is unusable, or null when it is valid.
 * `z.coerce.number()` maps an empty field and null to 0, which no era contains.
 */
function alumniGraduationYearError(year: number): string | null {
  if (!Number.isFinite(year) || year === 0) {
    return "Select your graduation year.";
  }

  if (!Number.isInteger(year)) {
    return "Graduation year must be a whole number.";
  }

  const oldest = ALUMNI_GRADUATION_YEAR_RANGES[0];
  const newest = ALUMNI_GRADUATION_YEAR_RANGES[ALUMNI_GRADUATION_YEAR_RANGES.length - 1];

  if (year > newest.end) {
    return `Graduation year cannot be later than ${newest.end}.`;
  }

  if (year < oldest.start) {
    return `Graduation year must be ${oldest.start} or later.`;
  }

  if (year >= HIATUS_START && year <= HIATUS_END) {
    return `ACD awarded no college degrees between ${HIATUS_START} and ${HIATUS_END}.`;
  }

  return null;
}

export const alumniProfileSchema = z.object({
  graduation_year: z.coerce.number().superRefine((year, ctx) => {
    const message = alumniGraduationYearError(year);

    if (message) {
      ctx.addIssue({ code: "custom", message });
    }
  }),
  program_id: z.string().uuid("Please select a valid Program"),
  major_id: z.string().uuid().optional().nullable().or(z.literal("")),
});

export type AlumniProfileInput = z.infer<typeof alumniProfileSchema>;

export type AlumniProfileFormValues = Omit<AlumniProfileInput, "graduation_year"> & {
  graduation_year: number | "";
};
