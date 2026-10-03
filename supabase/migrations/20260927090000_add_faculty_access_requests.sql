-- CreateEnum
CREATE TYPE "faculty_approval_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- (The `course_assignments_class_identity_key` NULLS NOT DISTINCT unique index
--  is SQL-only domain drift that the Prisma datamodel cannot represent; it is
--  left untouched here so this migration adds exactly the Faculty approval
--  state and nothing else.)


-- CreateTable
CREATE TABLE "faculty_access_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "status" "faculty_approval_status" NOT NULL DEFAULT 'PENDING',
    "decided_by" UUID,
    "decided_at" TIMESTAMP(3),
    "decision_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faculty_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "faculty_access_requests_user_id_key" ON "faculty_access_requests"("user_id");

-- CreateIndex
CREATE INDEX "faculty_access_requests_status_idx" ON "faculty_access_requests"("status");

-- AddForeignKey
ALTER TABLE "faculty_access_requests" ADD CONSTRAINT "faculty_access_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_access_requests" ADD CONSTRAINT "faculty_access_requests_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_access_requests" ADD CONSTRAINT "faculty_access_requests_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Server-only boundary: the Faculty approval state is a private
-- account/administration record reachable only through server-side Prisma.
-- Without these statements the hosted Supabase default grants would leave it
-- readable and writable by anon/authenticated through the Data API.
-- See src/lib/db/table-access-dispositions.ts for the canonical registry.
ALTER TABLE "faculty_access_requests" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "faculty_access_requests" FROM anon, authenticated;
