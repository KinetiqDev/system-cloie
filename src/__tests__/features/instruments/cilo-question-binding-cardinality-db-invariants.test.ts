// fallow-ignore-file code-duplication
import crypto from "node:crypto";
import { CourseScope, DeploymentStatus, StudentSection, YearLevel } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";

/**
 * CILO question binding cardinality (issue #626): a course CILO may be
 * evidenced by several Likert questions, while a question still carries at most
 * one CILO. The database enforces that shape on both the draft template table
 * and the published-evaluation snapshot table.
 *
 * Every test owns its disposable rows and cleans them up in the finally block.
 * The seeded catalog is reused read-only.
 */

function randomSuffix(): string {
  return crypto.randomUUID().slice(0, 8);
}

interface OwnedRows {
  templateId: string;
  courseId: string;
  ciloIds: [string, string];
  assignmentId: string;
  evaluationId: string;
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

/** Creates the disposable course with two CILOs, its template, and its evaluation. */
async function seedOwnedRows(): Promise<OwnedRows> {
  const suffix = randomSuffix();
  const { term, program, faculty, templateVersion } = await seedPromise;

  const course = await prisma.course.create({
    data: {
      code: `BIND-TEST-${suffix}`,
      title: "CILO binding cardinality test course",
      course_scope: CourseScope.GENERAL_EDUCATION,
      is_active: true,
    },
  });

  const firstCilo = await prisma.cILO.create({
    data: {
      course_id: course.id,
      description: "First outcome",
      is_active: true,
      created_by: faculty.id,
    },
  });
  const secondCilo = await prisma.cILO.create({
    data: {
      course_id: course.id,
      description: "Second outcome",
      is_active: true,
      created_by: faculty.id,
    },
  });

  const template = await prisma.instrumentTemplate.create({
    data: {
      code: `BIND-TEST-${suffix}`,
      name: "CILO binding cardinality test template",
      is_active: true,
      template_type: "COURSE_BOUND",
      bound_course_id: course.id,
      faculty_owner_id: faculty.id,
      structure: [
        {
          key: "cilo-items",
          title: "Outcomes",
          questions: [
            { key: "q1", prompt: "First question", type: "likert" },
            { key: "q2", prompt: "Second question", type: "likert" },
          ],
        },
      ],
    },
  });

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

  const evaluation = await prisma.courseBoundEvaluation.create({
    data: {
      term_instance_id: term.id,
      course_assignment_id: assignment.id,
      deployment_name: `CILO binding cardinality ${suffix}`,
      instrument_version_id: templateVersion.id,
      cilos_snapshot: [],
      course_info_snapshot: {},
      published_at: new Date(),
      status: DeploymentStatus.ACTIVE,
    },
  });

  return {
    templateId: template.id,
    courseId: course.id,
    ciloIds: [firstCilo.id, secondCilo.id],
    assignmentId: assignment.id,
    evaluationId: evaluation.id,
  };
}

async function cleanupOwnedRows(rows: OwnedRows): Promise<void> {
  await prisma.courseBoundCiloQuestionBinding.deleteMany({
    where: { course_bound_evaluation_id: rows.evaluationId },
  });
  await prisma.courseBoundEvaluation.deleteMany({ where: { id: rows.evaluationId } });
  await prisma.courseAssignment.deleteMany({ where: { id: rows.assignmentId } });
  await prisma.instrumentTemplateCiloQuestionBinding.deleteMany({
    where: { template_id: rows.templateId },
  });
  await prisma.instrumentTemplate.deleteMany({ where: { id: rows.templateId } });
  await prisma.cILO.deleteMany({ where: { course_id: rows.courseId } });
  await prisma.course.deleteMany({ where: { id: rows.courseId } });
}

describe.skipIf(!process.env.DATABASE_URL || process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1")(
  "CILO question binding cardinality invariants",
  () => {
    it("stores one CILO bound to several template questions and rejects a question with two", async () => {
      const rows = await seedOwnedRows();
      const [firstCilo, secondCilo] = rows.ciloIds;

      try {
        await prisma.instrumentTemplateCiloQuestionBinding.createMany({
          data: [
            {
              template_id: rows.templateId,
              cilo_id: firstCilo,
              section_key: "cilo-items",
              item_key: "q1",
            },
            {
              template_id: rows.templateId,
              cilo_id: firstCilo,
              section_key: "cilo-items",
              item_key: "q2",
            },
          ].map((binding) => ({
            ...binding,
            cilo_description_snapshot: "First outcome",
            question_prompt_snapshot: `Prompt for ${binding.item_key}`,
          })),
        });

        await expect(
          prisma.instrumentTemplateCiloQuestionBinding.create({
            data: {
              template_id: rows.templateId,
              cilo_id: secondCilo,
              cilo_description_snapshot: "Second outcome",
              section_key: "cilo-items",
              item_key: "q1",
              question_prompt_snapshot: "Prompt for q1",
            },
          })
        ).rejects.toSatisfy(isUniqueConstraintError);
      } finally {
        await cleanupOwnedRows(rows);
      }
    }, 30000);

    it("stores one CILO bound to several published-evaluation questions and rejects a question with two", async () => {
      const rows = await seedOwnedRows();
      const [firstCilo, secondCilo] = rows.ciloIds;

      try {
        await prisma.courseBoundCiloQuestionBinding.createMany({
          data: [
            { section_key: "cilo-items", item_key: "q1" },
            { section_key: "cilo-items", item_key: "q2" },
          ].map((binding) => ({
            ...binding,
            course_bound_evaluation_id: rows.evaluationId,
            cilo_id: firstCilo,
            cilo_description_snapshot: "First outcome",
            question_prompt_snapshot: `Prompt for ${binding.item_key}`,
          })),
        });

        await expect(
          prisma.courseBoundCiloQuestionBinding.create({
            data: {
              course_bound_evaluation_id: rows.evaluationId,
              cilo_id: secondCilo,
              cilo_description_snapshot: "Second outcome",
              section_key: "cilo-items",
              item_key: "q1",
              question_prompt_snapshot: "Prompt for q1",
            },
          })
        ).rejects.toSatisfy(isUniqueConstraintError);
      } finally {
        await cleanupOwnedRows(rows);
      }
    }, 30000);

    it("keeps existing rows valid without a backfill", async () => {
      const rows = await seedOwnedRows();

      try {
        const bindings = await prisma.instrumentTemplateCiloQuestionBinding.findMany({
          where: { template_id: { not: rows.templateId }, cilo_id: { not: null } },
          select: { template_id: true, cilo_id: true, section_key: true, item_key: true },
          take: 500,
        });

        // Every seeded binding satisfies the widened key: distinct
        // (template, CILO, question) triples, one CILO per question.
        const triples = new Set(
          bindings.map(
            (binding) =>
              `${binding.template_id}:${binding.cilo_id}:${binding.section_key}:${binding.item_key}`
          )
        );
        expect(triples.size).toBe(bindings.length);
        for (const binding of bindings) {
          const questionKey = `${binding.template_id}:${binding.section_key}:${binding.item_key}`;
          expect(
            bindings.filter(
              (candidate) =>
                `${candidate.template_id}:${candidate.section_key}:${candidate.item_key}` ===
                questionKey
            )
          ).toHaveLength(1);
        }
      } finally {
        await cleanupOwnedRows(rows);
      }
    }, 30000);
  }
);
