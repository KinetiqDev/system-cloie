// fallow-ignore-file code-duplication
import crypto from "node:crypto";
import { CourseScope, DeploymentStatus, StudentSection, YearLevel } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";

/**
 * Published Course-bound GO question bindings: a Likert question may cover
 * several Graduate Outcomes and one GO may span several questions, so
 * uniqueness is the full (evaluation, GO, question) pair. The rows must also
 * survive a GO deletion with their frozen labels intact.
 *
 * Every test owns its disposable rows and cleans them up in the finally block.
 * The seeded catalog is reused read-only.
 */

function randomSuffix(): string {
  return crypto.randomUUID().slice(0, 8);
}

interface OwnedRows {
  programId: string;
  courseId: string;
  templateId: string;
  assignmentId: string;
  evaluationId: string;
  goIds: [string, string];
}

const seedPromise = (async () => {
  const term = await prisma.academicTermInstance.findFirstOrThrow({ where: { status: "ACTIVE" } });
  const faculty = await prisma.user.findFirstOrThrow({
    where: { roles: { some: { role: "FACULTY" } } },
  });
  const seededProgram = await prisma.program.findFirstOrThrow();
  return { term, faculty, seededProgram };
})();

/** One binding row for a disposable evaluation. */
function bindingFor(rows: OwnedRows, { goId, itemKey }: { goId: string | null; itemKey: string }) {
  return {
    course_bound_evaluation_id: rows.evaluationId,
    go_code_snapshot: "BTGO",
    go_description_snapshot: "Snapshot description",
    go_id: goId,
    item_key: itemKey,
    question_prompt_snapshot: "Snapshot prompt",
    section_key: "go-items",
  };
}

/** Creates a disposable Program with two GOs, its course, template, and evaluation. */
async function seedOwnedRows(): Promise<OwnedRows> {
  const suffix = randomSuffix();
  const { term, faculty, seededProgram } = await seedPromise;

  const program = await prisma.program.create({
    data: { code: `BIND-TEST-${suffix}`, name: `Binding test program ${suffix}` },
  });

  const firstGo = await prisma.gO.create({
    data: {
      code: `BTGO1-${suffix}`,
      description: "First graduate outcome",
      program_id: program.id,
    },
  });
  const secondGo = await prisma.gO.create({
    data: {
      code: `BTGO2-${suffix}`,
      description: "Second graduate outcome",
      program_id: program.id,
    },
  });

  const course = await prisma.course.create({
    data: {
      code: `BIND-TEST-${suffix}`,
      title: "Course-bound GO binding test course",
      course_scope: CourseScope.PROGRAM_SPECIFIC,
      program_id: program.id,
      is_active: true,
    },
  });

  const template = await prisma.instrumentTemplate.create({
    data: {
      code: `BIND-TEST-${suffix}`,
      name: "Course-bound GO binding test template",
      is_active: true,
      template_type: "COURSE_BOUND",
      bound_course_id: course.id,
      bound_program_id: program.id,
      faculty_owner_id: faculty.id,
      structure: [
        {
          key: "go-items",
          title: "Outcomes",
          questions: [
            { key: "q1", prompt: "First question", type: "likert" },
            { key: "q2", prompt: "Second question", type: "likert" },
          ],
        },
      ],
    },
  });

  const version = await prisma.instrumentVersion.create({
    data: {
      template_id: template.id,
      version_number: 1,
      structure_snapshot: template.structure as object,
    },
  });

  const assignment = await prisma.courseAssignment.create({
    data: {
      term_instance_id: term.id,
      faculty_id: faculty.id,
      course_id: course.id,
      program_id: seededProgram.id,
      year_level: YearLevel.FIRST_YEAR,
      section: StudentSection.MORNING,
      is_active: true,
    },
  });

  const evaluation = await prisma.courseBoundEvaluation.create({
    data: {
      term_instance_id: term.id,
      course_assignment_id: assignment.id,
      deployment_name: `Course-bound GO binding ${suffix}`,
      instrument_version_id: version.id,
      cilos_snapshot: [],
      course_info_snapshot: {},
      published_at: new Date(),
      status: DeploymentStatus.ACTIVE,
    },
  });

  return {
    programId: program.id,
    courseId: course.id,
    templateId: template.id,
    assignmentId: assignment.id,
    evaluationId: evaluation.id,
    goIds: [firstGo.id, secondGo.id],
  };
}

async function cleanupOwnedRows(rows: OwnedRows): Promise<void> {
  await prisma.courseBoundGoQuestionBinding.deleteMany({
    where: { course_bound_evaluation_id: rows.evaluationId },
  });
  await prisma.courseBoundEvaluation.deleteMany({ where: { id: rows.evaluationId } });
  await prisma.courseAssignment.deleteMany({ where: { id: rows.assignmentId } });
  await prisma.instrumentTemplate.deleteMany({ where: { id: rows.templateId } });
  await prisma.gO.deleteMany({ where: { program_id: rows.programId } });
  await prisma.course.deleteMany({ where: { id: rows.courseId } });
  await prisma.program.deleteMany({ where: { id: rows.programId } });
}

describe.skipIf(!process.env.DATABASE_URL || process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1")(
  "Course-bound GO question binding invariants",
  () => {
    it("stores one GO bound to several questions and several GOs bound to one question", async () => {
      const rows = await seedOwnedRows();
      const [firstGo, secondGo] = rows.goIds;

      try {
        await prisma.courseBoundGoQuestionBinding.createMany({
          data: [
            bindingFor(rows, { goId: firstGo, itemKey: "q1" }),
            bindingFor(rows, { goId: firstGo, itemKey: "q2" }),
            bindingFor(rows, { goId: secondGo, itemKey: "q1" }),
          ],
        });

        const stored = await prisma.courseBoundGoQuestionBinding.findMany({
          where: { course_bound_evaluation_id: rows.evaluationId },
          select: { go_id: true, item_key: true },
        });
        expect(stored).toHaveLength(3);
        expect(
          stored.filter((binding) => binding.go_id === firstGo).map((binding) => binding.item_key)
        ).toEqual(["q1", "q2"]);
        expect(stored.filter((binding) => binding.item_key === "q1")).toHaveLength(2);
      } finally {
        await cleanupOwnedRows(rows);
      }
    }, 30000);

    it("rejects a duplicate (evaluation, GO, question) pair", async () => {
      const rows = await seedOwnedRows();
      const [firstGo] = rows.goIds;

      try {
        const binding = bindingFor(rows, { goId: firstGo, itemKey: "q1" });
        await prisma.courseBoundGoQuestionBinding.create({ data: binding });

        await expect(
          prisma.courseBoundGoQuestionBinding.create({ data: binding })
        ).rejects.toSatisfy(isUniqueConstraintError);
      } finally {
        await cleanupOwnedRows(rows);
      }
    }, 30000);

    it("keeps the frozen snapshot when its GO is deleted", async () => {
      const rows = await seedOwnedRows();
      const [firstGo] = rows.goIds;

      try {
        await prisma.courseBoundGoQuestionBinding.create({
          data: {
            ...bindingFor(rows, { goId: firstGo, itemKey: "q1" }),
            go_code_snapshot: "BTGO1",
          },
        });

        await prisma.gO.delete({ where: { id: firstGo } });

        const stored = await prisma.courseBoundGoQuestionBinding.findFirstOrThrow({
          where: { course_bound_evaluation_id: rows.evaluationId },
        });
        expect(stored.go_id).toBeNull();
        expect(stored.go_code_snapshot).toBe("BTGO1");
        expect(stored.go_description_snapshot).toBe("Snapshot description");
      } finally {
        await cleanupOwnedRows(rows);
      }
    }, 30000);

    it("deletes the published bindings with their evaluation", async () => {
      const rows = await seedOwnedRows();

      try {
        await prisma.courseBoundGoQuestionBinding.create({
          data: bindingFor(rows, { goId: rows.goIds[0], itemKey: "q1" }),
        });

        await prisma.courseBoundEvaluation.delete({ where: { id: rows.evaluationId } });

        await expect(
          prisma.courseBoundGoQuestionBinding.count({
            where: { course_bound_evaluation_id: rows.evaluationId },
          })
        ).resolves.toBe(0);
      } finally {
        await cleanupOwnedRows(rows);
      }
    }, 30000);
  }
);
