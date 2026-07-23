-- Course-bound publication exclusions are tied to the roster membership, not
-- only to a Student ID, so the decision remains auditable and cannot target
-- outsiders.
CREATE TYPE "CourseBoundEvaluationExclusionCategory" AS ENUM (
  'APPROVED_ACCOMMODATION',
  'NOT_TAKING_ASSESSMENT',
  'ADMINISTRATIVE_EXCEPTION',
  'OTHER'
);

CREATE UNIQUE INDEX "course_assignment_memberships_id_assignment_key"
  ON "course_assignment_memberships"("id", "course_assignment_id");

CREATE UNIQUE INDEX "course_bound_evaluations_id_assignment_key"
  ON "course_bound_evaluations"("id", "course_assignment_id");

CREATE TABLE "course_bound_evaluation_exclusions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "course_bound_evaluation_id" UUID NOT NULL,
  "course_assignment_id" UUID NOT NULL,
  "course_assignment_membership_id" UUID NOT NULL,
  "category" "CourseBoundEvaluationExclusionCategory" NOT NULL,
  "other_explanation" TEXT,
  "excluded_by" UUID NOT NULL,
  "excluded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "course_bound_evaluation_exclusions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "course_bound_evaluation_exclusions_other_check" CHECK (
    ("category" = 'OTHER'
      AND "other_explanation" IS NOT NULL
      AND char_length(btrim("other_explanation")) BETWEEN 5 AND 200
       AND "other_explanation" !~* '(^|[^[:alnum:]_])(medical|diagnosis|diagnosed|illness|disease|disability|medication|therapy|treatment|doctor|hospital|disciplinary|discipline|misconduct|suspension|expulsion|cheating|plagiarism|harassment|sanction)([^[:alnum:]_]|$)')
    OR
    ("category" <> 'OTHER' AND "other_explanation" IS NULL)
  ),
  CONSTRAINT "course_bound_evaluation_exclusions_evaluation_fkey"
    FOREIGN KEY ("course_bound_evaluation_id", "course_assignment_id") REFERENCES "course_bound_evaluations"("id", "course_assignment_id") ON DELETE CASCADE,
  CONSTRAINT "course_bound_evaluation_exclusions_membership_fkey"
    FOREIGN KEY ("course_assignment_membership_id", "course_assignment_id") REFERENCES "course_assignment_memberships"("id", "course_assignment_id") ON DELETE CASCADE,
  CONSTRAINT "course_bound_evaluation_exclusions_actor_fkey"
    FOREIGN KEY ("excluded_by") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE UNIQUE INDEX "course_bound_evaluation_exclusions_eval_membership_key"
  ON "course_bound_evaluation_exclusions"("course_bound_evaluation_id", "course_assignment_membership_id");
CREATE INDEX "course_bound_evaluation_exclusions_membership_idx"
  ON "course_bound_evaluation_exclusions"("course_assignment_membership_id");
CREATE INDEX "course_bound_evaluation_exclusions_evaluation_idx"
  ON "course_bound_evaluation_exclusions"("course_bound_evaluation_id");

ALTER TABLE "course_bound_evaluation_exclusions" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "course_bound_evaluation_exclusions" FROM anon, authenticated;

-- Publication and roster mutation share the Course-assignment row as their
-- lock boundary. This prevents future membership writers from bypassing the
-- application lifecycle guard.
CREATE OR REPLACE FUNCTION prevent_published_course_assignment_roster_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.course_assignment_id IS DISTINCT FROM NEW.course_assignment_id THEN
    PERFORM 1 FROM public.course_assignments WHERE id = OLD.course_assignment_id FOR UPDATE;
  END IF;

  PERFORM 1
  FROM public.course_assignments assignment
  WHERE assignment.id = CASE
    WHEN TG_OP = 'DELETE' THEN OLD.course_assignment_id
    ELSE NEW.course_assignment_id
  END
  FOR UPDATE;

  IF EXISTS (
    SELECT 1
    FROM public.course_bound_evaluations evaluation
    WHERE evaluation.course_assignment_id IN (
      CASE WHEN TG_OP = 'DELETE' THEN OLD.course_assignment_id ELSE NEW.course_assignment_id END,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.course_assignment_id ELSE NULL END
    )
      AND evaluation.published_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Course-assignment roster is locked after evaluation publication';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS published_course_assignment_roster_lock ON public.course_assignment_memberships;
CREATE TRIGGER published_course_assignment_roster_lock
BEFORE INSERT OR UPDATE OR DELETE ON public.course_assignment_memberships
FOR EACH ROW
EXECUTE FUNCTION prevent_published_course_assignment_roster_mutation();

REVOKE ALL ON FUNCTION public.prevent_published_course_assignment_roster_mutation() FROM PUBLIC;
