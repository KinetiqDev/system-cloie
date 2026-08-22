-- CreateTable: multi-program affiliation for industry partners (Program Head multi-select is app-layer only; industry partner was the only missing join)
CREATE TABLE "industry_partner_program_affiliations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "industry_partner_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "industry_partner_program_affiliations_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "industry_partner_program_affiliations_program_id_idx" ON "industry_partner_program_affiliations"("program_id");
-- CreateIndex
CREATE UNIQUE INDEX "industry_partner_program_affiliations_industry_partner_id_program_id_key" ON "industry_partner_program_affiliations"("industry_partner_id", "program_id");
-- AddForeignKey
ALTER TABLE "industry_partner_program_affiliations" ADD CONSTRAINT "industry_partner_program_affiliations_industry_partner_id_fkey" FOREIGN KEY ("industry_partner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "industry_partner_program_affiliations" ADD CONSTRAINT "industry_partner_program_affiliations_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
