import { CourseBoundEvaluationExclusionCategory } from "@prisma/client";
import { z } from "zod";
import { isNeutralOtherExplanation } from "../exclusion-text";

const exclusionSchema = z
  .object({
    category: z.nativeEnum(CourseBoundEvaluationExclusionCategory),
    membershipId: z.string().uuid(),
    otherExplanation: z.string().trim().optional(),
  })
  .superRefine((value, context) => {
    if (value.category === CourseBoundEvaluationExclusionCategory.OTHER) {
      if (
        !value.otherExplanation ||
        value.otherExplanation.length < 5 ||
        value.otherExplanation.length > 200 ||
        !isNeutralOtherExplanation(value.otherExplanation)
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Other exclusion explanations must be 5-200 neutral characters without sensitive details.",
          path: ["otherExplanation"],
        });
      }
      return;
    }

    if (value.otherExplanation) {
      context.addIssue({
        code: "custom",
        message: "Only an Other exclusion may include an explanation.",
        path: ["otherExplanation"],
      });
    }
  });

export const publishCourseBoundEvaluationSchema = z.object({
  assignmentId: z.string().uuid(),
  activationAt: z.date().nullable().optional(),
  deadlineAt: z.date().nullable().optional(),
  deploymentName: z.string().trim().min(1, "Deployment name is required."),
  exclusions: z.array(exclusionSchema).optional(),
  programId: z.string().uuid().optional(),
  templateId: z.string().uuid(),
});
