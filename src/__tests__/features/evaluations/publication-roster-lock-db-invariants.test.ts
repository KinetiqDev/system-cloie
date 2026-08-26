import crypto from "node:crypto";
import { CourseScope, DeploymentStatus, StudentSection, YearLevel } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";

/**
 * Course-bound publication roster-lock invariants (issue #546): the
 * `prevent_published_course_assignment_roster_mutation` trigger rejects
 * INSERT/UPDATE/DELETE on `course_assignment_memberships` once the
 * assignment has a published evaluation, the publication transaction is
 * atomic (no partial writes survive a mid-transaction failure), the roster
 * lock does not block legitimate late-inclusion writes (reversal update +
 * new EvaluationAssignment), and a duplicate deployment cannot be created
 * for the same assignment.
 *
 * Every test owns its disposable rows (course, assignment, users,
 * membership, evaluation) and cleans them up in the finally block. The
 * seeded catalog (active term instance, program, faculty, CILO_EVAL
 * template version) is reused read-only.
 */

function randomSuffix(): string {
  return crypto.randomUUID().slice(0, 8);
}

interface OwnedRows {
  courseId: string;
  assignmentId: string;
  evaluationId: string | null;
  studentId: string;
  actorId: string;
  membershipId: string;
  templateVersionId: string;
  termInstanceId: string;
  programId: string;
}

const seedPromise = (async () => {
  const term = await prisma.academicTermInstance.findFirstOrThrow({ where: { status: "ACTIVE" } });
  const program = await prisma.program.findFirstOrThrow();
  const faculty = await prisma.user.findFirstOrThrow({
    where: { roles: { some: { role: "FACULTY" } } },
  });
  const templateVersion = await prisma.instrumentVersion.findFirstOrThrow({
    where: { template: { code: "CILO_EVAL" }, version_number: 1 },
  });
  return { term, program, faculty, templateVersion };
})();

/**
 * Creates the disposable course/assignment/roster for one test. When
 * `withPublishedEvaluation` is true the assignment also carries a published
 * Course-bound evaluation (arming the roster-lock trigger); the rollback
 * test needs the assignment unlocked so its own transaction owns the write.
 */
async function seedOwnedRows(withPublishedEvaluation: boolean): Promise<OwnedRows> {
  const suffix = randomSuffix();
  const { term, program, faculty, templateVersion } = await seedPromise;

  const studentId = crypto.randomUUID();
  const actorId = crypto.randomUUID();

  const course = await prisma.course.create({
    data: {
      code: `LOCK-TEST-${suffix}`,
      title: "Publication lock test course",
      course_scope: CourseScope.GENERAL_EDUCATION,
      is_active: true,
    },
  });

  for (const user of [
    { id: studentId, email: `lock-test-student-${suffix}@test.invalid`, name: "Lock Test Student" },
    { id: actorId, email: `lock-test-actor-${suffix}@test.invalid`, name: "Lock Test Actor" },
  ]) {
    await prisma.user.create({ data: user });
    await prisma.userRole.create({
      data: { user_id: user.id, role: user.id === studentId ? "STUDENT" : "FACULTY" },
    });
  }

  const assignment = await prisma.courseAssignment.create({
    data: {
      term_instance_id: term.id,
      faculty_id: faculty.id,
      course_id: course.id,
      program_id: program.id,
      year_level: YearLevel.FIRST_YEAR,
      section: StudentSection.MORNING,
      is_active: true,
    },
  });

  const membership = await prisma.courseAssignmentMembership.create({
    data: {
      course_assignment_id: assignment.id,
      student_user_id: studentId,
      course_id: course.id,
      term_instance_id: term.id,
      program_id: program.id,
      is_active: true,
      created_by: actorId,
      updated_by: actorId,
    },
  });

  let evaluationId: string | null = null;
  if (withPublishedEvaluation) {
    evaluationId = (
      await prisma.courseBoundEvaluation.create({
        data: {
          term_instance_id: term.id,
          course_assignment_id: assignment.id,
          deployment_name: "Publication lock test evaluation",
          instrument_version_id: templateVersion.id,
          cilos_snapshot: [],
          course_info_snapshot: {},
          published_at: new Date(),
          status: DeploymentStatus.ACTIVE,
        },
      })
    ).id;
  }

  return {
    courseId: course.id,
    assignmentId: assignment.id,
    evaluationId,
    studentId,
    actorId,
    membershipId: membership.id,
    templateVersionId: templateVersion.id,
    termInstanceId: term.id,
    programId: program.id,
  };
}

async function cleanupOwnedRows(rows: OwnedRows): Promise<void> {
  if (rows.evaluationId) {
    await prisma.courseBoundEvaluation.deleteMany({ where: { id: rows.evaluationId } });
  }
  await prisma.courseAssignmentMembership.deleteMany({ where: { id: rows.membershipId } });
  await prisma.courseAssignment.deleteMany({ where: { id: rows.assignmentId } });
  await prisma.course.deleteMany({ where: { id: rows.courseId } });
  await prisma.userRole.deleteMany({ where: { user_id: { in: [rows.studentId, rows.actorId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [rows.studentId, rows.actorId] } } });
}

describe.skipIf(!process.env.DATABASE_URL || process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1")(
  "Course-bound publication roster-lock invariants",
  () => {
    it("rejects membership INSERT/UPDATE/DELETE after publication", async () => {
      const rows = await seedOwnedRows(true);

      try {
        // INSERT: the trigger must reject a new membership for the assignment.
        await expect(
          prisma.courseAssignmentMembership.create({
            data: {
              course_assignment_id: rows.assignmentId,
              student_user_id: rows.actorId,
              course_id: rows.courseId,
              term_instance_id: rows.termInstanceId,
              program_id: rows.programId,
              is_active: true,
              created_by: rows.actorId,
              updated_by: rows.actorId,
            },
          })
        ).rejects.toThrow(/locked after evaluation publication/);

        // UPDATE: deactivating an existing membership is also a roster write.
        await expect(
          prisma.courseAssignmentMembership.update({
            where: { id: rows.membershipId },
            data: {
              is_active: false,
              updated_by: rows.actorId,
              removed_by: rows.actorId,
              removed_at: new Date(),
            },
          })
        ).rejects.toThrow(/locked after evaluation publication/);

        // DELETE: removal of a membership is a roster write.
        await expect(
          prisma.courseAssignmentMembership.delete({ where: { id: rows.membershipId } })
        ).rejects.toThrow(/locked after evaluation publication/);
      } finally {
        await cleanupOwnedRows(rows);
      }
    }, 30000);

    it("is atomic: no deployment or assignment survives a transaction failure", async () => {
      const rows = await seedOwnedRows(false);
      const rollbackEvaluationId = crypto.randomUUID();

      try {
        // Simulate the publication transaction: create the deployment and its
        // CILO snapshots, then hit a foreign-key failure on the LAST write
        // (assignment to a non-existent respondent). The whole transaction must
        // roll back — no deployment, no snapshots, no assignments.
        await expect(
          prisma.$transaction(async (tx) => {
            await tx.courseBoundEvaluation.create({
              data: {
                id: rollbackEvaluationId,
                term_instance_id: rows.termInstanceId,
                course_assignment_id: rows.assignmentId,
                deployment_name: "Rollback test evaluation",
                instrument_version_id: rows.templateVersionId,
                cilos_snapshot: [],
                course_info_snapshot: {},
                published_at: new Date(),
                status: DeploymentStatus.ACTIVE,
              },
            });
            await tx.courseBoundCiloQuestionBinding.createMany({
              data: [
                {
                  course_bound_evaluation_id: rollbackEvaluationId,
                  cilo_description_snapshot: "Rollback CILO",
                  section_key: "cilo-items",
                  item_key: "cilo-attainment-1",
                  question_prompt_snapshot: "Rollback prompt",
                },
              ],
            });
            await tx.evaluationAssignment.createMany({
              data: [
                {
                  course_bound_id: rollbackEvaluationId,
                  respondent_id: crypto.randomUUID(), // FK violation — respondent does not exist
                },
              ],
            });
          })
        ).rejects.toThrow();

        const deployed = await prisma.courseBoundEvaluation.findUnique({
          where: { id: rollbackEvaluationId },
        });
        expect(deployed).toBeNull();
        const bindings = await prisma.courseBoundCiloQuestionBinding.count({
          where: { course_bound_evaluation_id: rollbackEvaluationId },
        });
        expect(bindings).toBe(0);
        const assignments = await prisma.evaluationAssignment.count({
          where: { course_bound_id: rollbackEvaluationId },
        });
        expect(assignments).toBe(0);
      } finally {
        await cleanupOwnedRows(rows);
      }
    }, 30000);

    it("late-inclusion writes bypass the roster lock", async () => {
      const rows = await seedOwnedRows(true);

      try {
        // Record an exclusion at publication time (the seeded deployment is
        // already published). Reversal updates the exclusion row and creates a
        // new EvaluationAssignment — the roster-lock trigger must NOT block
        // either write, because they never touch course_assignment_memberships.
        const exclusion = await prisma.courseBoundEvaluationExclusion.create({
          data: {
            course_bound_evaluation_id: rows.evaluationId!,
            course_assignment_id: rows.assignmentId,
            course_assignment_membership_id: rows.membershipId,
            category: "ADMINISTRATIVE_EXCEPTION",
            excluded_by: rows.actorId,
          },
        });

        await prisma.courseBoundEvaluationExclusion.update({
          where: { id: exclusion.id },
          data: {
            reversal_category: "EXCLUDED_IN_ERROR",
            reversed_by: rows.actorId,
            reversed_at: new Date(),
          },
        });

        const lateAssignment = await prisma.evaluationAssignment.create({
          data: {
            course_bound_id: rows.evaluationId!,
            respondent_id: rows.studentId,
          },
        });
        expect(lateAssignment.id).toBeTruthy();

        // The roster itself stays locked: a membership write is still rejected.
        await expect(
          prisma.courseAssignmentMembership.delete({ where: { id: rows.membershipId } })
        ).rejects.toThrow(/locked after evaluation publication/);

        await prisma.evaluationAssignment.delete({ where: { id: lateAssignment.id } });
      } finally {
        await cleanupOwnedRows(rows);
      }
    }, 30000);

    it("rejects a duplicate deployment for the same assignment", async () => {
      const rows = await seedOwnedRows(true);

      try {
        // The unique course_assignment_id index is the DB backstop for the
        // one-evaluation-per-assignment rule; a second deployment fails.
        await expect(
          prisma.courseBoundEvaluation.create({
            data: {
              term_instance_id: rows.termInstanceId,
              course_assignment_id: rows.assignmentId,
              deployment_name: "Duplicate test evaluation",
              instrument_version_id: rows.templateVersionId,
              cilos_snapshot: [],
              course_info_snapshot: {},
              published_at: new Date(),
              status: DeploymentStatus.ACTIVE,
            },
          })
        ).rejects.toMatchObject({ code: "P2002" });
      } finally {
        await cleanupOwnedRows(rows);
      }
    }, 30000);
  }
);
