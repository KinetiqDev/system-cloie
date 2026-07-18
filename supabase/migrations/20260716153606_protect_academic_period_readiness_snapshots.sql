BEGIN;

ALTER TABLE "academic_period_readiness_snapshots" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "academic_period_readiness_snapshots" FROM anon, authenticated;

COMMIT;
