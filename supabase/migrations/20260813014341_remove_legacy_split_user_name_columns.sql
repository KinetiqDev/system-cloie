-- Canonical User.name contract cleanup (OpenSpec: consolidate-google-authoritative-user-name, task 7.1).
--
-- The name-only application release was verified before this migration. The
-- expansion bridge is no longer needed after all application consumers moved
-- to User.name. This migration is intentionally irreversible: an opaque name
-- cannot be split back into the original semantic first/last components.
--
-- Preconditions fail closed so an incomplete expansion cannot silently lose
-- the compatibility bridge or legacy data.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'name'
      AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION
      'users.name must exist and be NOT NULL before legacy name cleanup';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND conname = 'users_name_not_blank'
  ) THEN
    RAISE EXCEPTION
      'users.name must retain the users_name_not_blank constraint before legacy name cleanup';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.users
    WHERE "name" IS NULL OR "name" ~ '^[[:space:]]*$'
  ) THEN
    RAISE EXCEPTION
      'users.name contains NULL or whitespace-only values; refusing legacy name cleanup';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name IN ('first_name', 'last_name')
  ) THEN
    RAISE EXCEPTION
      'legacy split name columns are already absent; migration history is inconsistent';
  END IF;
END $$;

DROP TRIGGER IF EXISTS users_compat_fill_name_from_split_fields ON "users";
DROP FUNCTION IF EXISTS public.users_compat_fill_name_from_split_fields();

ALTER TABLE "users"
  DROP COLUMN "first_name",
  DROP COLUMN "last_name";

COMMIT;
