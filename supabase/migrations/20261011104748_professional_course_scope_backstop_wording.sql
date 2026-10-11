-- Correct the Course-scope wording in the active scope backstop.
--
-- 20261011102138 renamed the CourseScope label to PROFESSIONAL, but this
-- function's error text still called that class "Program-specific Courses".
-- The rename migration could not reach it: Postgres does not rewrite
-- plpgsql bodies on ALTER TYPE RENAME VALUE, and the string here is raised as
-- a message, not compared as a label. An inventory of every non-system
-- function definition, table comment, column comment, constraint, type, index,
-- and policy found this as the only remaining occurrence of the old wording.
--
-- Only the message text changes. The scope behavior is byte-identical: same
-- NULL guard, same General Education rejection, same owning-Program
-- requirement, same cross-Program rejection, same return. The function keeps
-- its existing owner, volatility, and trigger binding. Earlier migrations keep
-- the wording they were applied with; this file is the current definition.

CREATE OR REPLACE FUNCTION enforce_cilo_mapping_program_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  course_scope text;
  course_program_id uuid;
  po_program_id uuid;
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
    RAISE EXCEPTION 'Professional Courses must belong to an Academic Program (cilo %)', NEW.cilo_id;
  END IF;

  SELECT program_id
    INTO po_program_id
    FROM gos
   WHERE id = NEW.po_id;

  IF po_program_id IS NULL THEN
    RAISE EXCEPTION 'Program Outcome % does not exist', NEW.po_id;
  END IF;

  IF po_program_id IS DISTINCT FROM course_program_id THEN
    RAISE EXCEPTION 'Program Outcomes must belong to the Course Academic Program (cilo %, po %)', NEW.cilo_id, NEW.po_id;
  END IF;

  RETURN NEW;
END;
$$;
