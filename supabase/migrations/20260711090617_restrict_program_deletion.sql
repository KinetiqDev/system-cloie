-- Verify live schema before replacing both Instrument Template Program links.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'instrument_templates'
      AND column_name = 'bound_program_id'
  ) THEN
    RAISE EXCEPTION 'instrument_templates.bound_program_id is missing; aborting Program deletion restriction migration';
  END IF;
END $$;

-- DropForeignKey
ALTER TABLE "central_deployments" DROP CONSTRAINT "central_deployments_program_id_fkey";

-- DropForeignKey
ALTER TABLE "course_bound_evaluation_targets" DROP CONSTRAINT "course_bound_evaluation_targets_program_id_fkey";

-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_program_id_fkey";

-- DropForeignKey
ALTER TABLE "external_stakeholder_invites" DROP CONSTRAINT "external_stakeholder_invites_program_id_fkey";

-- DropForeignKey
ALTER TABLE "faculty_program_affiliations" DROP CONSTRAINT "faculty_program_affiliations_program_id_fkey";

-- DropForeignKey
ALTER TABLE "gos" DROP CONSTRAINT "gos_program_id_fkey";

-- DropForeignKey
ALTER TABLE "industry_partner_profiles" DROP CONSTRAINT "industry_partner_profiles_program_id_fkey";

-- DropForeignKey
ALTER TABLE "instrument_templates" DROP CONSTRAINT "instrument_templates_bound_program_id_fkey";

-- DropForeignKey
ALTER TABLE "instrument_templates" DROP CONSTRAINT "instrument_templates_program_id_fkey";

-- DropForeignKey
ALTER TABLE "majors" DROP CONSTRAINT "majors_program_id_fkey";

-- DropForeignKey
ALTER TABLE "program_head_assignments" DROP CONSTRAINT "program_head_assignments_program_id_fkey";

-- AddForeignKey
ALTER TABLE "majors" ADD CONSTRAINT "majors_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gos" ADD CONSTRAINT "gos_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_templates" ADD CONSTRAINT "instrument_templates_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_templates" ADD CONSTRAINT "instrument_templates_bound_program_id_fkey" FOREIGN KEY ("bound_program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_program_affiliations" ADD CONSTRAINT "faculty_program_affiliations_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_head_assignments" ADD CONSTRAINT "program_head_assignments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_bound_evaluation_targets" ADD CONSTRAINT "course_bound_evaluation_targets_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "central_deployments" ADD CONSTRAINT "central_deployments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_stakeholder_invites" ADD CONSTRAINT "external_stakeholder_invites_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "industry_partner_profiles" ADD CONSTRAINT "industry_partner_profiles_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
