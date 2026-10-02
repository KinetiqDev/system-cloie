-- Close direct anon/authenticated access to the academic calendar (issue #649).
--
-- The prior policy authorized any identity holding an assigned SECRETARY row.
-- It has no workspace context, so it cannot honor the active role the app
-- resolves per session, and it cannot carry the HTTP-only sign-in method gate
-- (ADR 0031). These tables have no Data API consumer — every read and write
-- goes through Prisma, where the lifecycle services and secretary actions
-- authorize the caller — so they move to the existing server-only boundary
-- used by every other Prisma table. No data changes.
--
-- Direct Auth clients lose calendar access; Prisma server behavior is unchanged.
-- Registry: src/lib/db/table-access-dispositions.ts

BEGIN;

DROP POLICY IF EXISTS "Enable write access for secretary only" ON "school_years";
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "school_years";

DROP POLICY IF EXISTS "Enable write access for secretary only" ON "academic_term_instances";
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "academic_term_instances";

ALTER TABLE "school_years" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "academic_term_instances" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "school_years" FROM anon, authenticated;
REVOKE ALL ON TABLE "academic_term_instances" FROM anon, authenticated;

COMMIT;