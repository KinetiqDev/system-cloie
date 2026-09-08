-- Course rosters remain mutable while their Course assignment and Academic
-- Period are active. Membership writes continue to serialize on the
-- Course-assignment row in the application service; the published-evaluation
-- trigger is removed so late roster additions and corrections can proceed.
DROP TRIGGER IF EXISTS published_course_assignment_roster_lock
  ON public.course_assignment_memberships;

DROP FUNCTION IF EXISTS public.prevent_published_course_assignment_roster_mutation();
