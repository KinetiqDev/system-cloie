import { z } from "zod";

export const facultyProfileSchema = z.object({
  program_id: z.string().uuid("Please select a valid Program"),
});

export type FacultyProfileInput = z.infer<typeof facultyProfileSchema>;
export type FacultyProfileFormValues = FacultyProfileInput;
