-- #324: CurriculumVersion + CurriculumCourse schema.
--
-- Generated via `pnpm supabase:migration:diff -- add_curriculum_versions_and_courses`
-- and curated: unrelated pre-existing drift statements (index renames/retypes,
-- NULLS NOT DISTINCT mirror-index drops) were stripped so this migration only
-- touches the new curriculum tables.

-- CreateEnum
CREATE TYPE "curriculum_version_status" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');

-- CreateTable
CREATE TABLE "curriculum_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "program_id" UUID NOT NULL,
    "major_id" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "status" "curriculum_version_status" NOT NULL DEFAULT 'DRAFT',
    "effective_from_school_year_id" UUID,
    "published_at" TIMESTAMP(3),
    "published_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_courses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "curriculum_version_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "year_level" "year_level" NOT NULL,
    "semester" "academic_semester" NOT NULL,
    "term" "academic_term",
    "course_code_snapshot" TEXT NOT NULL,
    "course_title_snapshot" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_courses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "curriculum_versions_program_id_status_idx" ON "curriculum_versions"("program_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_versions_program_id_code_key" ON "curriculum_versions"("program_id", "code");

-- CreateIndex
CREATE INDEX "curriculum_courses_curriculum_version_id_course_id_idx" ON "curriculum_courses"("curriculum_version_id", "course_id");

-- CreateIndex
CREATE INDEX "curriculum_courses_course_id_idx" ON "curriculum_courses"("course_id");

-- AddForeignKey
ALTER TABLE "curriculum_versions" ADD CONSTRAINT "curriculum_versions_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_versions" ADD CONSTRAINT "curriculum_versions_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "majors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_versions" ADD CONSTRAINT "curriculum_versions_effective_from_school_year_id_fkey" FOREIGN KEY ("effective_from_school_year_id") REFERENCES "school_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_versions" ADD CONSTRAINT "curriculum_versions_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_courses" ADD CONSTRAINT "curriculum_courses_curriculum_version_id_fkey" FOREIGN KEY ("curriculum_version_id") REFERENCES "curriculum_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_courses" ADD CONSTRAINT "curriculum_courses_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-added: valid semester/term pairs. SUMMER must have a null term;
-- FIRST/SECOND must carry a non-null term. Matches AcademicTermInstance usage
-- where SUMMER periods have no term.
ALTER TABLE "curriculum_courses" ADD CONSTRAINT "curriculum_courses_semester_term_check" CHECK (
  ("semester" = 'SUMMER' AND "term" IS NULL)
  OR ("semester" IN ('1ST', '2ND') AND "term" IS NOT NULL)
);

-- Hand-added: RLS. Authenticated users may read; writes restricted to
-- SECRETARY and PROGRAM_HEAD via the auth UUID join (same shape as
-- 20260618153711_fix_secretary_rls_user_join.sql).
ALTER TABLE "curriculum_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "curriculum_courses" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON curriculum_versions
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Enable write access for secretary and program head" ON curriculum_versions
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid() AND ur.role IN ('SECRETARY', 'PROGRAM_HEAD')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid() AND ur.role IN ('SECRETARY', 'PROGRAM_HEAD')
  )
);

CREATE POLICY "Enable read access for authenticated users" ON curriculum_courses
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Enable write access for secretary and program head" ON curriculum_courses
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid() AND ur.role IN ('SECRETARY', 'PROGRAM_HEAD')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid() AND ur.role IN ('SECRETARY', 'PROGRAM_HEAD')
  )
);
