-- #372: Secretary Institutional Outcome catalog.
--
-- Catalog-only slice. Creates the college-wide institutional_outcomes table
-- that later General Education CILO mappings will reference. Does not add
-- typed CILO mapping tables, delete legacy CILO-to-GO rows, or change
-- readiness snapshot schema.

BEGIN;

CREATE TABLE IF NOT EXISTS "institutional_outcomes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutional_outcomes_pkey" PRIMARY KEY ("id")
);

-- Codes stay unique across active and archived rows so restore cannot collide.
CREATE UNIQUE INDEX IF NOT EXISTS "institutional_outcomes_code_key"
    ON "institutional_outcomes"("code");

-- App server uses Prisma. Keep the catalog out of direct anon/authenticated
-- Data API access and rely on server authorization for writes.
ALTER TABLE "institutional_outcomes" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "institutional_outcomes" FROM anon, authenticated;

COMMIT;
