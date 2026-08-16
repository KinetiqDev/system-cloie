-- #404: drop the unverified Student-entered identifier after Gate A.
-- Existing values are intentionally discarded without replacement.

ALTER TABLE "student_academic_profiles"
  DROP COLUMN "student_id_number";
