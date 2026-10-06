-- Rename `cilo_mappings.go_id` to `po_id` to complete the Program Outcome (PO)
-- terminology cutover. This is an in-place column rename, not a drop/add:
-- existing CILOMapping rows, the unique index, the foreign key, and the
-- SQL-only scope-check trigger all survive intact.
--
-- `prisma migrate diff` cannot emit this. The trigger function references
-- `NEW.go_id` by name, so the differ reads the column as dropped rather than
-- renamed and emits a drop/add pair, which fails on a non-empty table and
-- would silently discard stored Program Outcome mappings. Everything below is
-- therefore written by hand.
--
-- The binding and snapshot tables are already `plo_id` in the deployed schema
-- and keep those physical names; only `cilo_mappings` carried a GO-era name.

-- The scope-check trigger is dropped before the rename and reinstalled below,
-- so it never fires mid-migration against a stale column. Every step is
-- guarded: a database that already carries `po_id` — because this rename was
-- applied out of band — must still replay this file cleanly.
DROP TRIGGER IF EXISTS cilo_mappings_scope_check ON cilo_mappings;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'cilo_mappings'
       AND column_name = 'go_id'
  ) THEN
    ALTER TABLE cilo_mappings RENAME COLUMN go_id TO po_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cilo_mappings_go_id_fkey'
  ) THEN
    ALTER TABLE cilo_mappings RENAME CONSTRAINT cilo_mappings_go_id_fkey
      TO cilo_mappings_po_id_fkey;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'cilo_mappings_cilo_id_go_id_key') THEN
    ALTER INDEX cilo_mappings_cilo_id_go_id_key RENAME TO cilo_mappings_cilo_id_po_id_key;
  END IF;
END
$$;

-- Reinstall the scope-check trigger with Program Outcome terminology.
CREATE OR REPLACE FUNCTION enforce_cilo_mapping_program_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  course_scope text;
  course_program_id uuid;
  po_program_id uuid;
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

  IF course_program_id IS NULL THEN
    RAISE EXCEPTION 'Program-specific Courses must belong to an Academic Program (cilo %)', NEW.cilo_id;
  END IF;

  SELECT program_id
    INTO po_program_id
    FROM gos
   WHERE id = NEW.po_id;

  IF po_program_id IS NULL THEN
    RAISE EXCEPTION 'Program Outcome % does not exist', NEW.po_id;
  END IF;

  IF po_program_id IS DISTINCT FROM course_program_id THEN
    RAISE EXCEPTION 'Program Outcomes must belong to the Course Academic Program (cilo %, po %)', NEW.cilo_id, NEW.po_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER cilo_mappings_scope_check
  BEFORE INSERT OR UPDATE OF cilo_id, po_id
  ON cilo_mappings
  FOR EACH ROW
  EXECUTE FUNCTION enforce_cilo_mapping_program_scope();
