-- Program Head report-export audit trail.
--
-- Named-response report exports are confidential. Every download records the
-- exporting actor, the Program and filters it applied, and the aggregate size
-- of the submitted evidence it released. Only aggregate counts are stored; no
-- respondent identity, response row, or rating value is recorded here.
--
-- The generated diff also proposed dropping
-- `course_assignments_class_identity_key` and renaming a pre-existing
-- `course_bound_plo_question_bindings` foreign key. Both are SQL-backed
-- constraints Prisma does not model exactly, they exist on deployed databases,
-- and they are unrelated to this change, so they are intentionally excluded.

-- CreateEnum
CREATE TYPE "ReportExportKind" AS ENUM ('COURSE_WORKBOOK', 'PROGRAM_OUTCOME_WORKBOOK', 'RAW_QUANTITATIVE_CSV');

-- CreateTable
CREATE TABLE "report_export_audits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "export_kind" "ReportExportKind" NOT NULL,
    "identified" BOOLEAN NOT NULL DEFAULT true,
    "school_year_id" UUID,
    "semester" "academic_semester",
    "term_instance_id" UUID,
    "year_level" "year_level",
    "submitted_response_count" INTEGER NOT NULL DEFAULT 0,
    "rating_item_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_export_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_export_audits_actor_id_idx" ON "report_export_audits"("actor_id");

-- CreateIndex
CREATE INDEX "report_export_audits_program_id_idx" ON "report_export_audits"("program_id");

-- AddForeignKey
ALTER TABLE "report_export_audits" ADD CONSTRAINT "report_export_audits_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_export_audits" ADD CONSTRAINT "report_export_audits_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Audit writes happen only through the re-authorizing server export boundary.
ALTER TABLE report_export_audits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON report_export_audits FROM anon, authenticated;
