-- Preserve the complete class context used by published Course-bound evaluations.
-- Existing publication-time labels win over reconstructed live values. Newly
-- reconstructed fields are labelled honestly instead of being presented as
-- publication-time observations.
SET lock_timeout = '5s';
SET statement_timeout = '30s';

UPDATE public.course_bound_evaluations AS evaluation
SET course_info_snapshot =
  jsonb_strip_nulls(
    jsonb_build_object(
      'courseAssignmentId', assignment.id,
      'courseId', course.id,
      'courseCode', course.code,
      'courseTitle', course.title,
      'courseScope', course.course_scope,
      'programId', program.id,
      'programCode', program.code,
      'programName', program.name,
      'majorId', major.id,
      'majorName', major.name,
      'termInstanceId', period.id,
      'schoolYearCode', school_year.code,
      'semester', period.semester,
      'term', period.term,
      'yearLevel', assignment.year_level,
      'section', assignment.section,
      'facultyId', faculty.id,
      'facultyName', faculty.name,
      'capturedAt', COALESCE(evaluation.published_at, evaluation.created_at),
      'assignmentContextSource', 'BACKFILLED_CURRENT_STATE'
    )
  )
  || COALESCE(evaluation.course_info_snapshot, '{}'::jsonb)
  || jsonb_build_object('snapshotSchemaVersion', 2)
FROM public.course_assignments AS assignment
JOIN public.courses AS course ON course.id = assignment.course_id
JOIN public.programs AS program ON program.id = assignment.program_id
LEFT JOIN public.majors AS major ON major.id = course.major_id
JOIN public.academic_term_instances AS period ON period.id = assignment.term_instance_id
JOIN public.school_years AS school_year ON school_year.id = period.school_year_id
JOIN public.users AS faculty ON faculty.id = assignment.faculty_id
WHERE evaluation.course_assignment_id = assignment.id
  AND evaluation.published_at IS NOT NULL
  AND COALESCE((evaluation.course_info_snapshot ->> 'snapshotSchemaVersion')::integer, 0) < 2;

CREATE OR REPLACE FUNCTION public.prevent_published_course_evaluation_snapshot_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.published_at IS NOT NULL
     AND NEW.course_info_snapshot IS DISTINCT FROM OLD.course_info_snapshot THEN
    RAISE EXCEPTION 'Published Course-bound evaluation context is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS published_course_evaluation_snapshot_lock
  ON public.course_bound_evaluations;
CREATE TRIGGER published_course_evaluation_snapshot_lock
BEFORE UPDATE ON public.course_bound_evaluations
FOR EACH ROW
EXECUTE FUNCTION public.prevent_published_course_evaluation_snapshot_change();

CREATE OR REPLACE FUNCTION public.prevent_published_course_assignment_faculty_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.faculty_id IS DISTINCT FROM OLD.faculty_id
     AND EXISTS (
       SELECT 1
       FROM public.course_bound_evaluations AS evaluation
       WHERE evaluation.course_assignment_id = OLD.id
         AND evaluation.published_at IS NOT NULL
     ) THEN
    RAISE EXCEPTION 'Faculty cannot be reassigned after evaluation publication';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS published_course_assignment_faculty_lock
  ON public.course_assignments;
CREATE TRIGGER published_course_assignment_faculty_lock
BEFORE UPDATE ON public.course_assignments
FOR EACH ROW
EXECUTE FUNCTION public.prevent_published_course_assignment_faculty_change();
