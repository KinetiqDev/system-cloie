BEGIN;

CREATE TABLE IF NOT EXISTS "academic_period_readiness_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "period_id" UUID NOT NULL,
  "contexts" JSONB NOT NULL,
  "program_totals" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "academic_period_readiness_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "academic_period_readiness_snapshots_period_id_key" UNIQUE ("period_id"),
  CONSTRAINT "academic_period_readiness_snapshots_period_id_fkey"
    FOREIGN KEY ("period_id") REFERENCES "academic_term_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE OR REPLACE FUNCTION prevent_academic_period_readiness_snapshot_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Academic Period readiness snapshots are immutable';
END;
$$;

CREATE TRIGGER academic_period_readiness_snapshots_immutable
BEFORE UPDATE OR DELETE ON "academic_period_readiness_snapshots"
FOR EACH ROW EXECUTE FUNCTION prevent_academic_period_readiness_snapshot_mutation();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "cilo_mappings"
    GROUP BY "cilo_id", "go_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add unique CILO mapping constraint while duplicate pairs exist';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "cilo_mappings_cilo_id_go_id_key" ON "cilo_mappings"("cilo_id", "go_id");

COMMIT;
