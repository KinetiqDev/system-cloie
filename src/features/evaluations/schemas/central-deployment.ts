import { YearLevel } from "@prisma/client";
import { z } from "zod";

/**
 * Phase 9: Schema requires term_instance_id as the source of truth.
 * Legacy academic_year/semester fields removed.
 */
export const publishCentralDeploymentSchema = z
  .object({
    programId: z.string().uuid(),
    template_id: z.string().uuid(),
    deployment_name: z.string().trim().min(3, "Deployment name must be at least 3 characters."),
    target_stakeholder: z.enum(["STUDENT", "ALUMNI", "INDUSTRY_PARTNER"]),
    // Phase 9: term_instance_id is required (source of truth)
    term_instance_id: z.string().uuid(),
    major_id: z.string().uuid().optional(),
    year_level: z.nativeEnum(YearLevel).optional(),
    activation_at: z.coerce.date().optional(),
    deadline_at: z.coerce.date().optional(),
    respondent_ids: z.array(z.string().uuid()).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.target_stakeholder === "STUDENT" && !value.year_level) {
      ctx.addIssue({
        code: "custom",
        message: "Year level is required when publishing to students.",
        path: ["year_level"],
      });
    }
  });

export type PublishCentralDeploymentInput = z.infer<typeof publishCentralDeploymentSchema>;
