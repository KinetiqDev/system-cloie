-- #324 code-review follow-up: enforce program-major pairing on curriculum_versions.
--
-- The original migration created independent FKs for program_id and major_id,
-- so a secretary or program head could attach a major owned by a different
-- program to a curriculum version. The domain requires a Curriculum to belong
-- to one program (openspec introduce-versioned-curriculum design, Decision 1),
-- so a major-specific curriculum must reference one of that program's majors.
--
-- Replace the simple major FK with a composite FK (major_id, program_id)
-- referencing majors(id, program_id) — the same pattern already used by
-- alumni_profiles (migration 20260617163451_add_alumni_profile_composite_relation.sql).
-- ON DELETE RESTRICT (not SET NULL): a composite FK with SET NULL would null
-- program_id too, violating its NOT NULL constraint; RESTRICT matches the
-- alumni_profiles precedent and major soft-deletion (is_active) convention.

ALTER TABLE "curriculum_versions" DROP CONSTRAINT "curriculum_versions_major_id_fkey";

ALTER TABLE "curriculum_versions" ADD CONSTRAINT "curriculum_versions_major_id_program_id_fkey" FOREIGN KEY ("major_id", "program_id") REFERENCES "majors"("id", "program_id") ON DELETE RESTRICT ON UPDATE CASCADE;
