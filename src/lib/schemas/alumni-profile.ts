import { z } from "zod";

export const alumniProfileSchema = z.object({
  graduation_year: z.coerce
    .number()
    .int("Graduation year must be a whole number")
    .min(1950, "Graduation year must be 1950 or later")
    .max(new Date().getFullYear() + 5, "Graduation year is too far in the future"),
  program_id: z.string().uuid("Please select a valid Program"),
  major_id: z.string().uuid().optional().nullable().or(z.literal("")),
});

export type AlumniProfileInput = z.infer<typeof alumniProfileSchema>;

export type AlumniProfileFormValues = Omit<AlumniProfileInput, "graduation_year"> & {
  graduation_year: number | "";
};
