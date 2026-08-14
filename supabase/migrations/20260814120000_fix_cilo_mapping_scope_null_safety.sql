-- #373 review follow-up: make the Program-scope backstop NULL-safe.
--
-- courses.program_id is nullable. PostgreSQL evaluates `uuid <> NULL` as NULL,
-- so the previous guard did not fire for a PROGRAM_SPECIFIC CILO whose Course
-- has no owning Academic Program. Reject missing owners explicitly and compare
-- ownership with IS DISTINCT FROM.

BEGIN;

CREATE OR REPLACE FUNCTION enforce_cilo_mapping_program_scope()
RETURNS trigger AS $$
DECLARE
  course_scope text;
  course_program_id uuid;
  go_program_id uuid;
BEGIN
  SELECT co.course_scope, co.program_id
    INTO course_scope, course_program_id
    FROM cilos c
    JOIN courses co ON co.id = c.course_id
   WHERE c.id = NEW.cilo_id;

  IF course_scope IS NULL THEN
    RAISE EXCEPTION 'CILO % does not exist', NEW.cilo_id;
  END IF;

  IF course_scope = 'GENERAL_EDUCATION' THEN
    RAISE EXCEPTION 'General Education CILOs map only to Institutional Outcomes (cilo %)', NEW.cilo_id;
  END IF;

  IF course_program_id IS NULL THEN
    RAISE EXCEPTION 'Program-specific Courses must belong to an Academic Program (cilo %)', NEW.cilo_id;
  END IF;

  SELECT program_id
    INTO go_program_id
    FROM gos
   WHERE id = NEW.go_id;

  IF go_program_id IS NULL THEN
    RAISE EXCEPTION 'Graduate Outcome % does not exist', NEW.go_id;
  END IF;

  IF go_program_id IS DISTINCT FROM course_program_id THEN
    RAISE EXCEPTION 'Graduate Outcomes must belong to the Course Academic Program (cilo %, go %)', NEW.cilo_id, NEW.go_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
