import { z } from "zod";

export const industryPartnerProfileSchema = z.object({
  company_name: z.string().min(2, "Company name must be at least 2 characters"),
  position: z.string().optional().nullable().or(z.literal("")),
  program_id: z.string().uuid().optional().nullable().or(z.literal("")),
});

export type IndustryPartnerProfileInput = z.infer<typeof industryPartnerProfileSchema>;

export type IndustryPartnerProfileFormValues = IndustryPartnerProfileInput;
