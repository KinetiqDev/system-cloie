-- Keep Prisma's Major.upsert selector valid for the academic catalog seed.
CREATE UNIQUE INDEX "majors_program_id_name_key"
  ON "public"."majors"("program_id", "name");
