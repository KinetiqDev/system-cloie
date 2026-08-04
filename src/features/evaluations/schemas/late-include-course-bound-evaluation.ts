import { CourseBoundEvaluationExclusionReversalCategory } from "@prisma/client";
import { z } from "zod";
import { isNeutralOtherExplanation } from "../exclusion-text";

export const lateIncludeCourseBoundEvaluationSchema = z
  .object({
    evaluationId: z.string().uuid(),
    membershipId: z.string().uuid(),
    programId: z.string().uuid().optional(),
    reversalCategory: z.nativeEnum(CourseBoundEvaluationExclusionReversalCategory),
    reversalOtherExplanation: z.string().trim().optional(),
  })
  .superRefine((value, context) => {
    if (value.reversalCategory === CourseBoundEvaluationExclusionReversalCategory.OTHER) {
      if (
        !value.reversalOtherExplanation ||
        value.reversalOtherExplanation.length < 5 ||
        value.reversalOtherExplanation.length > 200 ||
        !isNeutralOtherExplanation(value.reversalOtherExplanation)
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Other reversal explanations must be 5-200 neutral characters without sensitive details.",
          path: ["reversalOtherExplanation"],
        });
      }
      return;
    }

    if (value.reversalOtherExplanation) {
      context.addIssue({
        code: "custom",
        message: "Only an Other reversal may include an explanation.",
        path: ["reversalOtherExplanation"],
      });
    }
  });
