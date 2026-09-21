-- System CLOIE: published Course-bound GO question bindings.
--
-- A Faculty member may bind one or more Graduate Outcomes of the bound
-- Course's owning Program directly to a Likert question, in addition to the
-- CILO binding that already exists. Direct GO bindings are authorial
-- statements about a published instrument, so they are frozen into immutable
-- snapshots at publication, exactly like the Program-wide
-- central_deployment_plo_snapshots rows: renaming, archiving, or moving a GO
-- must never rewrite or drop previously published Course-bound evidence.
--
-- A question may cover several GOs and a GO may span several questions;
-- uniqueness is the full (evaluation, GO, question) pair. General Education
-- Courses carry no GO binding: they have no owning Program and their CILOs
-- align to Institutional Outcomes (ADR 0005).
--
-- Additive only: no existing row is read, rewritten, or backfilled.
SET lock_timeout = '5s';
SET statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS "course_bound_plo_question_bindings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "course_bound_evaluation_id" UUID NOT NULL,
  "plo_id" UUID,
  "plo_code_snapshot" TEXT NOT NULL,
  "plo_description_snapshot" TEXT NOT NULL,
  "section_key" TEXT NOT NULL,
  "item_key" TEXT NOT NULL,
  "question_prompt_snapshot" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "course_bound_plo_question_bindings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cbgqb_evaluation_plo_question_key"
  ON "course_bound_plo_question_bindings"("course_bound_evaluation_id", "plo_id", "section_key", "item_key");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_bound_plo_question_bindings_course_bound_evaluation_id_fkey'
  ) THEN
    ALTER TABLE "course_bound_plo_question_bindings"
      ADD CONSTRAINT "course_bound_plo_question_bindings_course_bound_evaluation_id_fkey"
      FOREIGN KEY ("course_bound_evaluation_id") REFERENCES "course_bound_evaluations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_bound_plo_question_bindings_plo_id_fkey'
  ) THEN
    ALTER TABLE "course_bound_plo_question_bindings"
      ADD CONSTRAINT "course_bound_plo_question_bindings_plo_id_fkey"
      FOREIGN KEY ("plo_id") REFERENCES "gos"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Server-only table (see src/lib/db/table-access-dispositions.ts): the
-- application reads and writes it exclusively through Prisma, which bypasses
-- RLS and privilege checks. Without this, the hosted Supabase default grants
-- would leave it directly readable/writable through the Data API.
ALTER TABLE "course_bound_plo_question_bindings" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "course_bound_plo_question_bindings" FROM anon, authenticated;
