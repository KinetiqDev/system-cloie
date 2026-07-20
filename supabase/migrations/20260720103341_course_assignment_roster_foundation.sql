-- CreateTable
CREATE TABLE "course_assignment_memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_assignment_id" UUID NOT NULL,
    "student_user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "term_instance_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "removed_by" UUID,
    "removed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_assignment_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_assignment_memberships_course_assignment_id_is_activ_idx" ON "course_assignment_memberships"("course_assignment_id", "is_active");

-- CreateIndex
CREATE INDEX "course_assignment_memberships_student_user_id_term_instance_idx" ON "course_assignment_memberships"("student_user_id", "term_instance_id");

-- CreateIndex
CREATE INDEX "course_assignment_memberships_course_id_term_instance_id_pr_idx" ON "course_assignment_memberships"("course_id", "term_instance_id", "program_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "course_assignment_memberships_assignment_student_key" ON "course_assignment_memberships"("course_assignment_id", "student_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_assignments_membership_scope_key" ON "course_assignments"("id", "course_id", "term_instance_id", "program_id");

-- AddForeignKey
ALTER TABLE "course_assignment_memberships" ADD CONSTRAINT "course_assignment_memberships_course_assignment_id_course__fkey" FOREIGN KEY ("course_assignment_id", "course_id", "term_instance_id", "program_id") REFERENCES "course_assignments"("id", "course_id", "term_instance_id", "program_id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "course_assignment_memberships" ADD CONSTRAINT "course_assignment_memberships_student_user_id_fkey" FOREIGN KEY ("student_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignment_memberships" ADD CONSTRAINT "course_assignment_memberships_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignment_memberships" ADD CONSTRAINT "course_assignment_memberships_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignment_memberships" ADD CONSTRAINT "course_assignment_memberships_removed_by_fkey" FOREIGN KEY ("removed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keep roster lifecycle state internally coherent. A removed membership retains its row
-- for restoration and audit display; an active membership has no removal audit fields.
ALTER TABLE "course_assignment_memberships"
  ADD CONSTRAINT "course_assignment_memberships_active_removal_state_check"
  CHECK (
    ("is_active" = true AND "removed_by" IS NULL AND "removed_at" IS NULL)
    OR
    ("is_active" = false AND "removed_by" IS NOT NULL AND "removed_at" IS NOT NULL)
  );

-- A Student may be active in only one section for a Course, academic period, and
-- assignment program. Inactive rows remain as restoration history.
CREATE UNIQUE INDEX "course_assignment_memberships_active_scope_key"
  ON "course_assignment_memberships"("student_user_id", "course_id", "term_instance_id", "program_id")
  WHERE "is_active" = true;

-- Evaluation assignments belong to exactly one deployment kind and cannot duplicate
-- a respondent within that deployment. These PostgreSQL partial indexes are kept out
-- of Prisma's declarative schema because their predicates are significant.
DO $$
DECLARE
  invalid_deployment_rows BIGINT;
  duplicate_course_rows BIGINT;
  duplicate_central_rows BIGINT;
BEGIN
  SELECT count(*) INTO invalid_deployment_rows
  FROM "evaluation_assignments"
  WHERE num_nonnulls("course_bound_id", "central_deployment_id") <> 1;

  SELECT count(*) INTO duplicate_course_rows
  FROM (
    SELECT "course_bound_id", "respondent_id"
    FROM "evaluation_assignments"
    WHERE "course_bound_id" IS NOT NULL
    GROUP BY "course_bound_id", "respondent_id"
    HAVING count(*) > 1
  ) duplicates;

  SELECT count(*) INTO duplicate_central_rows
  FROM (
    SELECT "central_deployment_id", "respondent_id"
    FROM "evaluation_assignments"
    WHERE "central_deployment_id" IS NOT NULL
    GROUP BY "central_deployment_id", "respondent_id"
    HAVING count(*) > 1
  ) duplicates;

  IF invalid_deployment_rows > 0 OR duplicate_course_rows > 0 OR duplicate_central_rows > 0 THEN
    RAISE EXCEPTION
      'Cannot enforce evaluation assignment integrity: invalid deployment rows %, duplicate Course-bound pairs %, duplicate central pairs %',
      invalid_deployment_rows,
      duplicate_course_rows,
      duplicate_central_rows;
  END IF;
END $$;

ALTER TABLE "evaluation_assignments"
  ADD CONSTRAINT "evaluation_assignments_exactly_one_deployment_check"
  CHECK (num_nonnulls("course_bound_id", "central_deployment_id") = 1);

CREATE UNIQUE INDEX "evaluation_assignments_course_bound_respondent_key"
  ON "evaluation_assignments"("course_bound_id", "respondent_id")
  WHERE "course_bound_id" IS NOT NULL;

CREATE UNIQUE INDEX "evaluation_assignments_central_deployment_respondent_key"
  ON "evaluation_assignments"("central_deployment_id", "respondent_id")
  WHERE "central_deployment_id" IS NOT NULL;

-- The app server uses Prisma for roster access. Keep the new public table out of
-- direct anonymous/authenticated Data API access and rely on server authorization.
ALTER TABLE "course_assignment_memberships" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "course_assignment_memberships" FROM anon, authenticated;
