-- System CLOIE records actual offering history on CourseAssignment and does not
-- own official curriculum or prospectus lifecycle management.
SET lock_timeout = '5s';
SET statement_timeout = '30s';

ALTER TABLE public.course_assignments
  DROP CONSTRAINT IF EXISTS course_assignments_curriculum_course_id_fkey;

DROP INDEX IF EXISTS public.course_assignments_curriculum_course_id_idx;

ALTER TABLE public.course_assignments
  DROP COLUMN IF EXISTS curriculum_course_id;

DROP TABLE public.curriculum_courses;
DROP TABLE public.curriculum_versions;
DROP TYPE public.curriculum_version_status;
