-- Preserve publication exclusion provenance while recording evaluation-specific
-- late inclusion separately from the locked Course-assignment roster.
CREATE TYPE "CourseBoundEvaluationExclusionReversalCategory" AS ENUM (
  'EXCLUDED_IN_ERROR',
  'ELIGIBILITY_CORRECTED',
  'APPROVED_LATE_PARTICIPATION',
  'OTHER'
);

ALTER TABLE "course_bound_evaluation_exclusions"
  ADD COLUMN "reversal_category" "CourseBoundEvaluationExclusionReversalCategory",
  ADD COLUMN "reversal_other_explanation" TEXT,
  ADD COLUMN "reversed_by" UUID,
  ADD COLUMN "reversed_at" TIMESTAMP(3);

ALTER TABLE "course_bound_evaluation_exclusions"
  ADD CONSTRAINT "course_bound_evaluation_exclusions_reversal_check" CHECK (
    ("reversal_category" = 'OTHER'
      AND "reversal_other_explanation" IS NOT NULL
      AND char_length(btrim("reversal_other_explanation")) BETWEEN 5 AND 200
      AND "reversal_other_explanation" !~* '(^|[^[:alnum:]_])(medical|diagnosis|diagnosed|illness|disease|disability|medication|therapy|treatment|doctor|hospital|disciplinary|discipline|misconduct|suspension|expulsion|cheating|plagiarism|harassment|sanction)([^[:alnum:]_]|$)')
      AND "reversed_by" IS NOT NULL
      AND "reversed_at" IS NOT NULL)
    OR
    ("reversal_category" IS NOT NULL
      AND "reversal_category" <> 'OTHER'
      AND "reversal_other_explanation" IS NULL
      AND "reversed_by" IS NOT NULL
      AND "reversed_at" IS NOT NULL)
    OR
    ("reversal_category" IS NULL
      AND "reversal_other_explanation" IS NULL
      AND "reversed_by" IS NULL
      AND "reversed_at" IS NULL)
  );

ALTER TABLE "course_bound_evaluation_exclusions"
  ADD CONSTRAINT "course_bound_evaluation_exclusions_reversed_by_fkey"
    FOREIGN KEY ("reversed_by") REFERENCES "users"("id") ON DELETE RESTRICT;

CREATE INDEX "course_bound_evaluation_exclusions_reversed_by_idx"
  ON "course_bound_evaluation_exclusions"("reversed_by");
