CREATE INDEX "course_assignment_memberships_assignment_scope_idx"
  ON "course_assignment_memberships"(
    "course_assignment_id",
    "course_id",
    "term_instance_id",
    "program_id"
  );
