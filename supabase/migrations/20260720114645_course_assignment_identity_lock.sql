-- Once a roster exists, a Course assignment's class identity cannot move the
-- roster to another Course, period, program, year level, or section. Faculty
-- reassignment remains allowed because it does not change class identity.
CREATE OR REPLACE FUNCTION prevent_course_assignment_identity_change_with_memberships()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (
    NEW.course_id IS DISTINCT FROM OLD.course_id OR
    NEW.term_instance_id IS DISTINCT FROM OLD.term_instance_id OR
    NEW.program_id IS DISTINCT FROM OLD.program_id OR
    NEW.year_level IS DISTINCT FROM OLD.year_level OR
    NEW.section IS DISTINCT FROM OLD.section
  ) AND EXISTS (
    SELECT 1
    FROM public.course_assignment_memberships membership
    WHERE membership.course_assignment_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Course assignment identity is immutable after roster membership exists';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS course_assignment_identity_lock ON public.course_assignments;
CREATE TRIGGER course_assignment_identity_lock
BEFORE UPDATE ON public.course_assignments
FOR EACH ROW
EXECUTE FUNCTION prevent_course_assignment_identity_change_with_memberships();
