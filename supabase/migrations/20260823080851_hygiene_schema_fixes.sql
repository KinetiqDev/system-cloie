-- System CLOIE: hygiene schema fixes.
--
-- Two pre-existing drifts between the Prisma datamodel and the database:
-- 1. `gos.order` never received its DEFAULT 0 (the original migration used
--    ADD COLUMN IF NOT EXISTS on an existing column, which was a no-op).
-- 2. `cilo_mappings.go_id` FK says ON DELETE SET NULL, but the Prisma model
--    declares CASCADE and the column is NOT NULL, so SET NULL could never
--    succeed. Align the constraint with the model.

ALTER TABLE "gos" ALTER COLUMN "order" SET DEFAULT 0;

ALTER TABLE "cilo_mappings" DROP CONSTRAINT "cilo_mappings_go_id_fkey";
ALTER TABLE "cilo_mappings" ADD CONSTRAINT "cilo_mappings_go_id_fkey"
  FOREIGN KEY ("go_id") REFERENCES "gos"("id")
  ON UPDATE CASCADE ON DELETE CASCADE;
