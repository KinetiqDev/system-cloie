-- #373: General Education cutover — typed CILO → Institutional Outcome mapping.
--
-- Adds the college-wide typed General Education mapping relation, deletes the
-- legacy General Education CILO-to-GO rows after reporting the exact deletion
-- predicate and affected-row count, and installs database integrity backstops
-- that reject wrong-layer mapping writes for both typed relations.
--
-- The deletion is intentionally irreversible (openspec
-- introduce-institutional-learning-outcomes, Decision: legacy cutover).
-- Program-specific CILO-to-GO rows, CILOs, GOs, evaluations, and readiness
-- snapshots are untouched.

BEGIN;

-- ─── Preflight: report the exact predicate and count before deleting ────────
DO $$
DECLARE
  legacy_count integer;
BEGIN
  SELECT count(*)
    INTO legacy_count
    FROM cilo_mappings cm
    JOIN cilos c ON c.id = cm.cilo_id
    JOIN courses co ON co.id = c.course_id
   WHERE co.course_scope = 'GENERAL_EDUCATION';

  RAISE NOTICE 'legacy General Education deletion predicate: DELETE FROM cilo_mappings WHERE cilo_id IN (SELECT c.id FROM cilos c JOIN courses co ON co.id = c.course_id WHERE co.course_scope = ''GENERAL_EDUCATION'')';
  RAISE NOTICE 'legacy General Education CILO-to-GO rows affected: %', legacy_count;

  DELETE FROM cilo_mappings
   WHERE cilo_id IN (
     SELECT c.id
       FROM cilos c
       JOIN courses co ON co.id = c.course_id
      WHERE co.course_scope = 'GENERAL_EDUCATION'
   );

  RAISE NOTICE 'deleted % legacy General Education CILO-to-GO rows', legacy_count;
END $$;

-- ─── Typed General Education mapping relation ───────────────────────────────
CREATE TABLE "cilo_institutional_outcome_mappings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cilo_id" UUID NOT NULL,
    "institutional_outcome_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cilo_institutional_outcome_mappings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cilo_institutional_outcome_mappings_cilo_id_institutional_outcome_id_key"
    ON "cilo_institutional_outcome_mappings"("cilo_id", "institutional_outcome_id");
CREATE INDEX "cilo_institutional_outcome_mappings_cilo_id_idx"
    ON "cilo_institutional_outcome_mappings"("cilo_id");
CREATE INDEX "cilo_institutional_outcome_mappings_institutional_outcome_id_idx"
    ON "cilo_institutional_outcome_mappings"("institutional_outcome_id");

ALTER TABLE "cilo_institutional_outcome_mappings"
    ADD CONSTRAINT "cilo_institutional_outcome_mappings_cilo_id_fkey"
    FOREIGN KEY ("cilo_id") REFERENCES "cilos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cilo_institutional_outcome_mappings"
    ADD CONSTRAINT "cilo_institutional_outcome_mappings_institutional_outcome_id_fkey"
    FOREIGN KEY ("institutional_outcome_id") REFERENCES "institutional_outcomes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cilo_institutional_outcome_mappings"
    ADD CONSTRAINT "cilo_institutional_outcome_mappings_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cilo_institutional_outcome_mappings"
    ADD CONSTRAINT "cilo_institutional_outcome_mappings_updated_by_fkey"
    FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Scope integrity backstops ──────────────────────────────────────────────
-- General Education CILOs may map only to active Institutional Outcomes.
CREATE OR REPLACE FUNCTION enforce_cilo_institutional_outcome_mapping_scope()
RETURNS trigger AS $$
DECLARE
  course_scope text;
  ilo_is_active boolean;
BEGIN
  SELECT co.course_scope
    INTO course_scope
    FROM cilos c
    JOIN courses co ON co.id = c.course_id
   WHERE c.id = NEW.cilo_id;

  IF course_scope IS NULL OR course_scope <> 'GENERAL_EDUCATION' THEN
    RAISE EXCEPTION 'Institutional Outcomes map only General Education CILOs (cilo %)', NEW.cilo_id;
  END IF;

  SELECT is_active
    INTO ilo_is_active
    FROM institutional_outcomes
   WHERE id = NEW.institutional_outcome_id;

  IF ilo_is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Institutional Outcome mapping targets must be active (institutional_outcome %)', NEW.institutional_outcome_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cilo_institutional_outcome_mappings_scope_check
    BEFORE INSERT OR UPDATE OF cilo_id, institutional_outcome_id
    ON cilo_institutional_outcome_mappings
    FOR EACH ROW EXECUTE FUNCTION enforce_cilo_institutional_outcome_mapping_scope();

-- Graduate Outcomes map only Program-specific CILOs.
CREATE OR REPLACE FUNCTION enforce_cilo_mapping_program_scope()
RETURNS trigger AS $$
DECLARE
  course_scope text;
BEGIN
  SELECT co.course_scope
    INTO course_scope
    FROM cilos c
    JOIN courses co ON co.id = c.course_id
   WHERE c.id = NEW.cilo_id;

  IF course_scope = 'GENERAL_EDUCATION' THEN
    RAISE EXCEPTION 'General Education CILOs map only to Institutional Outcomes (cilo %)', NEW.cilo_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cilo_mappings_scope_check
    BEFORE INSERT OR UPDATE OF cilo_id
    ON cilo_mappings
    FOR EACH ROW EXECUTE FUNCTION enforce_cilo_mapping_program_scope();

-- ─── Server-only access (Prisma service layer is the write path) ────────────
ALTER TABLE "cilo_institutional_outcome_mappings" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "cilo_institutional_outcome_mappings" FROM anon, authenticated;

COMMIT;
