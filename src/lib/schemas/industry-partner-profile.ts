import { z } from "zod";

export const industryPartnerProfileSchema = z
  .object({
    company_name: z.string().min(2, "Company name must be at least 2 characters"),
    position: z.string().trim().min(1, "Position / title is required"),
    // ponytail: single optional stays for backward-compat API; multi is canonical
    program_id: z.string().uuid().optional().nullable().or(z.literal("")),
    program_ids: z.array(z.string().uuid()).optional(),
  })
  .superRefine((data, ctx) => {
    const ids = data.program_ids ?? (data.program_id ? [data.program_id] : []);
    if (ids.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Select at least one affiliated program.",
        path: ["program_ids"],
      });
      return;
    }
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: "custom", message: "Duplicate programs are not allowed.", path: ["program_ids"] });
    }
  });

export type IndustryPartnerProfileInput = z.infer<typeof industryPartnerProfileSchema>;

export type IndustryPartnerProfileFormValues = IndustryPartnerProfileInput;
