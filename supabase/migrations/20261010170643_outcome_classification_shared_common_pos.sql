-- CreateEnum
CREATE TYPE "POClassification" AS ENUM ('COMMON', 'CORE', 'PROFESSIONAL', 'INSTITUTION_SPECIFIC', 'UNCLASSIFIED');

-- CreateEnum
CREATE TYPE "GEAlignmentMode" AS ENUM ('ILO', 'COMMON_PO');

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "ge_alignment_mode" "GEAlignmentMode" NOT NULL DEFAULT 'ILO';

-- AlterTable
ALTER TABLE "gos" ADD COLUMN     "classification" "POClassification" NOT NULL DEFAULT 'UNCLASSIFIED',
ADD COLUMN     "common_outcome_id" UUID;

-- CreateTable
CREATE TABLE "common_program_outcomes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "source_ref" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "common_program_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outcome_changes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID NOT NULL,
    "input" JSONB NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outcome_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cilo_common_po_mappings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cilo_id" UUID NOT NULL,
    "common_outcome_id" UUID NOT NULL,
    "manifestation" "CILOMappingManifestation",
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cilo_common_po_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "common_program_outcomes_code_key" ON "common_program_outcomes"("code");

-- CreateIndex
CREATE INDEX "cilo_common_po_mappings_common_outcome_id_idx" ON "cilo_common_po_mappings"("common_outcome_id");

-- CreateIndex
CREATE UNIQUE INDEX "cilo_common_po_mappings_cilo_id_common_outcome_id_key" ON "cilo_common_po_mappings"("cilo_id", "common_outcome_id");

-- CreateIndex
CREATE INDEX "gos_classification_idx" ON "gos"("classification");
CREATE INDEX "gos_common_outcome_id_idx" ON "gos"("common_outcome_id");

-- CreateIndex
CREATE UNIQUE INDEX "gos_program_id_common_outcome_id_key" ON "gos"("program_id", "common_outcome_id");

-- AddForeignKey
ALTER TABLE "outcome_changes" ADD CONSTRAINT "outcome_changes_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cilo_common_po_mappings" ADD CONSTRAINT "cilo_common_po_mappings_cilo_id_fkey" FOREIGN KEY ("cilo_id") REFERENCES "cilos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cilo_common_po_mappings" ADD CONSTRAINT "cilo_common_po_mappings_common_outcome_id_fkey" FOREIGN KEY ("common_outcome_id") REFERENCES "common_program_outcomes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cilo_common_po_mappings" ADD CONSTRAINT "cilo_common_po_mappings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cilo_common_po_mappings" ADD CONSTRAINT "cilo_common_po_mappings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gos" ADD CONSTRAINT "gos_common_outcome_id_fkey" FOREIGN KEY ("common_outcome_id") REFERENCES "common_program_outcomes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Catalogs and mapping writes use the server-authorized Prisma boundary.
ALTER TABLE common_program_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cilo_common_po_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON common_program_outcomes, cilo_common_po_mappings, outcome_changes FROM anon, authenticated;

ALTER TABLE gos ADD CONSTRAINT gos_common_classification_check CHECK (
  (classification = 'COMMON' AND common_outcome_id IS NOT NULL)
  OR (classification <> 'COMMON' AND common_outcome_id IS NULL)
);
ALTER TABLE courses ADD CONSTRAINT courses_common_mode_scope_check CHECK (
  course_scope = 'GENERAL_EDUCATION' OR ge_alignment_mode = 'ILO'
);
CREATE UNIQUE INDEX common_program_outcomes_normalized_code_key
  ON common_program_outcomes (upper(btrim(code)));
ALTER TABLE common_program_outcomes ADD CONSTRAINT common_program_outcomes_nonblank_check
  CHECK (length(btrim(code)) > 0 AND length(btrim(description)) >= 3);

CREATE FUNCTION validate_cilo_common_po_scope() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cilos c JOIN courses course ON course.id = c.course_id
    WHERE c.id = NEW.cilo_id AND course.course_scope = 'GENERAL_EDUCATION'
  ) THEN
    RAISE EXCEPTION 'Common PO mappings require a General Education CILO';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM common_program_outcomes WHERE id = NEW.common_outcome_id AND is_active)
    AND (TG_OP = 'INSERT' OR NEW.common_outcome_id IS DISTINCT FROM OLD.common_outcome_id) THEN
    RAISE EXCEPTION 'New Common PO mappings require an active target';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER cilo_common_po_scope_check BEFORE INSERT OR UPDATE ON cilo_common_po_mappings
  FOR EACH ROW EXECUTE FUNCTION validate_cilo_common_po_scope();
REVOKE ALL ON FUNCTION validate_cilo_common_po_scope() FROM PUBLIC;

CREATE FUNCTION protect_ge_alignment_mode() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.ge_alignment_mode IS DISTINCT FROM OLD.ge_alignment_mode AND EXISTS (
    SELECT 1 FROM course_assignments ca JOIN course_bound_evaluations e ON e.course_assignment_id = ca.id
    WHERE ca.course_id = OLD.id AND e.status <> 'DRAFT'
  ) THEN
    RAISE EXCEPTION 'Published course history prevents an alignment mode change';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_ge_alignment_mode BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION protect_ge_alignment_mode();
REVOKE ALL ON FUNCTION protect_ge_alignment_mode() FROM PUBLIC;
