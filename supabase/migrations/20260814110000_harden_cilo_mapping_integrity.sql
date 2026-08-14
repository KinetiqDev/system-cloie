-- #373 review follow-up: harden typed mapping integrity and provenance.
--
-- Extends the cutover backstops so crafted writes cannot persist a
-- cross-Program CILO-to-GO mapping, and adds actor provenance columns to the
-- legacy CILO-to-GO relation. Existing legacy rows remain unattributed
-- (nullable columns); only new or changed writes receive actors.

BEGIN;

-- ─── Program-scope ownership backstop ───────────────────────────────────────
-- Graduate Outcomes map only Program-specific CILOs, and only from the
-- Course's owning Academic Program.
CREATE OR REPLACE FUNCTION enforce_cilo_mapping_program_scope()
RETURNS trigger AS $$
DECLARE
  course_scope text;
  course_program_id uuid;
  go_program_id uuid;
BEGIN
  SELECT co.course_scope, co.program_id
    INTO course_scope, course_program_id
    FROM cilos c
    JOIN courses co ON co.id = c.course_id
   WHERE c.id = NEW.cilo_id;

  IF course_scope IS NULL THEN
    RAISE EXCEPTION 'CILO % does not exist', NEW.cilo_id;
  END IF;

  IF course_scope = 'GENERAL_EDUCATION' THEN
    RAISE EXCEPTION 'General Education CILOs map only to Institutional Outcomes (cilo %)', NEW.cilo_id;
  END IF;

  SELECT program_id
    INTO go_program_id
    FROM gos
   WHERE id = NEW.go_id;

  IF go_program_id IS NULL THEN
    RAISE EXCEPTION 'Graduate Outcome % does not exist', NEW.go_id;
  END IF;

  IF go_program_id <> course_program_id THEN
    RAISE EXCEPTION 'Graduate Outcomes must belong to the Course Academic Program (cilo %, go %)', NEW.cilo_id, NEW.go_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER cilo_mappings_scope_check ON cilo_mappings;
CREATE TRIGGER cilo_mappings_scope_check
    BEFORE INSERT OR UPDATE OF cilo_id, go_id
    ON cilo_mappings
    FOR EACH ROW EXECUTE FUNCTION enforce_cilo_mapping_program_scope();

-- ─── CILO-to-GO mapping provenance ──────────────────────────────────────────
ALTER TABLE "cilo_mappings"
    ADD COLUMN "created_by" UUID,
    ADD COLUMN "updated_by" UUID;

ALTER TABLE "cilo_mappings"
    ADD CONSTRAINT "cilo_mappings_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cilo_mappings"
    ADD CONSTRAINT "cilo_mappings_updated_by_fkey"
    FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "cilo_mappings_created_by_idx" ON "cilo_mappings"("created_by");
CREATE INDEX "cilo_mappings_updated_by_idx" ON "cilo_mappings"("updated_by");

COMMIT;
