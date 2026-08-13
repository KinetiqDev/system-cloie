-- Canonical User.name expansion (OpenSpec: consolidate-google-authoritative-user-name, task 1.1).
--
-- Prisma cannot express the expand → backfill → bridge → require sequence in one
-- schema state, so this migration is curated rather than a raw `migrate diff`
-- dump. It intentionally does NOT drop first_name/last_name or the bridge
-- trigger; contract cleanup is a later migration after all consumers move to
-- name-only writes.
--
-- Whitespace contract: every trim/blank check uses POSIX [[:space:]] so tabs,
-- newlines, carriage returns, form feeds, and vertical tabs are treated the
-- same as ASCII spaces (no-blank, treat whitespace-only as absent). Plain
-- TRIM()/btrim() is intentionally avoided because it only removes 0x20.
--
-- Staged rollout:
--   1. Add nullable users.name
--   2. Backfill from whitespace-trimmed concat_ws(first_name, last_name)
--   3. Fail closed on blank/whitespace-only results (no invented placeholders)
--   4. Make legacy split columns nullable for name-only writers
--   5. Install temporary bridge trigger for old split-field writers
--   6. Enforce non-blank + NOT NULL on users.name
--
-- Rollback note: before the later contract migration, application rollback can
-- keep using first_name/last_name while this bridge remains. After contract
-- cleanup drops the split columns, automatic down-migration cannot reconstruct
-- original first/last values from an opaque name.

BEGIN;

-- 1. Expand: nullable name column
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "name" TEXT;

-- 2. Backfill from trimmed split components (single non-empty component is kept;
--    any whitespace-only component — spaces, tabs, newlines, etc. — is absent).
UPDATE "users"
SET "name" = NULLIF(
  regexp_replace(
    concat_ws(
      ' ',
      NULLIF(regexp_replace("first_name", '^[[:space:]]+|[[:space:]]+$', '', 'g'), ''),
      NULLIF(regexp_replace("last_name", '^[[:space:]]+|[[:space:]]+$', '', 'g'), '')
    ),
    '^[[:space:]]+|[[:space:]]+$',
    '',
    'g'
  ),
  ''
)
WHERE "name" IS NULL;

-- 3. Refuse blank / whitespace-only results without inventing placeholders
DO $$
DECLARE
  blank_count integer;
BEGIN
  SELECT COUNT(*)
  INTO blank_count
  FROM "users"
  WHERE "name" IS NULL
     OR "name" ~ '^[[:space:]]*$';

  IF blank_count > 0 THEN
    RAISE EXCEPTION
      'Cannot enforce users.name NOT NULL: % row(s) have blank backfilled names. Fix source first_name/last_name data; do not invent placeholders.',
      blank_count;
  END IF;
END;
$$;

-- 4. Compatibility window: old split columns become optional so name-only
--    application writes can omit them.
ALTER TABLE "users"
  ALTER COLUMN "first_name" DROP NOT NULL;
ALTER TABLE "users"
  ALTER COLUMN "last_name" DROP NOT NULL;

-- 5. Temporary bridge: derive name for old split-field writers; preserve
--    explicit name-only writes from the new application.
CREATE OR REPLACE FUNCTION public.users_compat_fill_name_from_split_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  derived_name text;
  trimmed_name text;
BEGIN
  derived_name := NULLIF(
    regexp_replace(
      concat_ws(
        ' ',
        NULLIF(regexp_replace(NEW."first_name", '^[[:space:]]+|[[:space:]]+$', '', 'g'), ''),
        NULLIF(regexp_replace(NEW."last_name", '^[[:space:]]+|[[:space:]]+$', '', 'g'), '')
      ),
      '^[[:space:]]+|[[:space:]]+$',
      '',
      'g'
    ),
    ''
  );

  IF TG_OP = 'INSERT' THEN
    -- Old writer omits name → fill from split fields.
    -- New writer supplies name → preserve (trim all outer whitespace only).
    IF NEW."name" IS NULL OR NEW."name" ~ '^[[:space:]]*$' THEN
      NEW."name" := derived_name;
    ELSE
      NEW."name" := regexp_replace(NEW."name", '^[[:space:]]+|[[:space:]]+$', '', 'g');
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: derive only when legacy components change and name was not changed
  -- by the writer. An explicit name write (name-only application) is preserved
  -- even if stale first_name/last_name remain on the row.
  IF (
    NEW."first_name" IS DISTINCT FROM OLD."first_name"
    OR NEW."last_name" IS DISTINCT FROM OLD."last_name"
  )
  AND (NEW."name" IS NOT DISTINCT FROM OLD."name") THEN
    IF derived_name IS NOT NULL THEN
      NEW."name" := derived_name;
    END IF;
  ELSIF NEW."name" IS NOT NULL THEN
    trimmed_name := regexp_replace(NEW."name", '^[[:space:]]+|[[:space:]]+$', '', 'g');
    -- Whitespace-only explicit writes become empty so the non-blank constraint
    -- rejects them; non-blank explicit names are preserved after outer trim.
    NEW."name" := NULLIF(trimmed_name, '');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_compat_fill_name_from_split_fields ON "users";
CREATE TRIGGER users_compat_fill_name_from_split_fields
  BEFORE INSERT OR UPDATE ON "users"
  FOR EACH ROW
  EXECUTE FUNCTION public.users_compat_fill_name_from_split_fields();

-- 6. Require non-blank canonical name for all rows going forward
--    (tabs/newlines/other whitespace-only values are blank under [[:space:]]).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_name_not_blank'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_name_not_blank"
      CHECK ("name" !~ '^[[:space:]]*$');
  END IF;
END;
$$;

ALTER TABLE "users"
  ALTER COLUMN "name" SET NOT NULL;

COMMIT;
