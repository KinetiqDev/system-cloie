-- System CLOIE: one CILO may be evidenced by several Likert questions.
--
-- A course CILO is often measured by more than one question — one question per
-- learning activity, or a multi-part instrument. The previous unique keys
-- enforced one question per CILO, so faculty had to either drop a question or
-- mis-map it to a different CILO, producing wrong per-CILO evidence.
--
-- Both binding tables keep their question-side unique key (a question still
-- carries at most one CILO) and widen their CILO-side key to the full
-- (CILO, question) pair, matching the PLO binding key shape.
--
-- Loosening only: every existing row satisfies the wider key, so no backfill is
-- required and existing templates and published evaluations stay valid.
SET lock_timeout = '5s';
SET statement_timeout = '30s';

-- Template draft bindings.
DROP INDEX IF EXISTS public.itcqb_template_cilo_key;
CREATE UNIQUE INDEX IF NOT EXISTS "itcqb_template_cilo_key"
  ON "instrument_template_cilo_question_bindings"("template_id", "cilo_id", "section_key", "item_key");

-- Published course-bound evaluation bindings.
DROP INDEX IF EXISTS public.course_bound_cilo_question_bindings_eval_cilo_key;
CREATE UNIQUE INDEX IF NOT EXISTS "course_bound_cilo_question_bindings_eval_cilo_key"
  ON "course_bound_cilo_question_bindings"("course_bound_evaluation_id", "cilo_id", "section_key", "item_key");
