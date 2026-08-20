-- Pickup: pnpm supabase:migration:diff -- add_ilo_mapping_manifestation
-- Reviewed and written as this slice only. The CILOMappingManifestation enum
-- already exists from 20260819151749_add_cilo_mapping_manifestation.sql.
-- Nullable for legacy General Education mapping rows; Faculty must classify
-- them. Do not invent a default manifestation.

-- AlterTable
ALTER TABLE "cilo_institutional_outcome_mappings" ADD COLUMN "manifestation" "CILOMappingManifestation";
