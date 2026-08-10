BEGIN;

ALTER TABLE "courses"
  ADD COLUMN IF NOT EXISTS "seed_source" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'courses_seed_source_allowed'
      AND conrelid = 'courses'::regclass
  ) THEN
    ALTER TABLE "courses"
      ADD CONSTRAINT "courses_seed_source_allowed"
      CHECK ("seed_source" IS NULL OR "seed_source" = 'ACD_DEMO_CATALOG');
  END IF;
END;
$$;

-- Existing rows predate provenance and cannot be classified safely: editable
-- course fields cannot distinguish a seeded row from a recreated user row.
-- Leave them NULL. The seed runner fails closed until an operator attests
-- ownership and assigns ACD_DEMO_CATALOG in a reviewed database transaction.

CREATE OR REPLACE FUNCTION prevent_course_seed_source_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."seed_source" IS NULL
    AND NEW."seed_source" IS NOT NULL
    AND NEW."seed_source" <> 'ACD_DEMO_CATALOG' THEN
    RAISE EXCEPTION 'Unknown course seed provenance';
  END IF;
  IF OLD."seed_source" IS NOT NULL
    AND OLD."seed_source" IS DISTINCT FROM NEW."seed_source" THEN
    RAISE EXCEPTION 'Course seed provenance is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS course_seed_source_immutable ON "courses";
CREATE TRIGGER course_seed_source_immutable
  BEFORE UPDATE OF "seed_source" ON "courses"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_course_seed_source_mutation();

COMMIT;
