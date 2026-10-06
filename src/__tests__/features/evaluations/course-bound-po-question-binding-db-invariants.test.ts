// fallow-ignore-file code-duplication
import crypto from "node:crypto";
import { CourseScope, DeploymentStatus, StudentSection, YearLevel } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";

/**
 * Published Course-bound PO question bindings: a Likert question may cover
 * several Program Outcomes and one PO may span several questions, so
 * uniqueness is the full (evaluation, PO, question) pair. The rows must also
 * survive a PO deletion with their frozen labels intact.
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
  poIds: [string, string];
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
function bindingFor(rows: OwnedRows, { poId, itemKey }: { poId: string | null; itemKey: string }) {
  return {
    course_bound_evaluation_id: rows.evaluationId,
    po_code_snapshot: "BTPO",
    po_description_snapshot: "Snapshot description",
    po_id: poId,
    item_key: itemKey,
    question_prompt_snapshot: "Snapshot prompt",
    section_key: "po-items",
  };
}

/** Creates a disposable Program with two POs, its course, template, and evaluation. */
async function seedOwnedRows(): Promise<OwnedRows> {
  const suffix = randomSuffix();
  const { term, faculty, seededProgram } = await seedPromise;

  const program = await prisma.program.create({
    data: { code: `BIND-TEST-${suffix}`, name: `Binding test program ${suffix}` },
  });

  const firstGo = await prisma.pO.create({
    data: {
      code: `BTPO-${suffix}`,
      description: "First program outcome",
      program_id: program.id,
    },
  });
  const secondGo = await prisma.pO.create({
    data: {
      code: `BTPO-${suffix}`,
      description: "Second program outcome",
      program_id: program.id,
    },
  });

  const course = await prisma.course.create({
    data: {
      code: `BIND-TEST-${suffix}`,
      title: "Course-bound PO binding test course",
      course_scope: CourseScope.PROGRAM_SPECIFIC,
      program_id: program.id,
      is_active: true,
    },
  });

  const template = await prisma.instrumentTemplate.create({
    data: {
      code: `BIND-TEST-${suffix}`,
      name: "Course-bound PO binding test template",
      is_active: true,
      template_type: "COURSE_BOUND",
      bound_course_id: course.id,
      bound_program_id: program.id,
      faculty_owner_id: faculty.id,
      structure: [
        {
          key: "po-items",
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
      deployment_name: `Course-bound PO binding ${suffix}`,
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
    poIds: [firstGo.id, secondGo.id],
  };
}

async function cleanupOwnedRows(rows: OwnedRows): Promise<void> {
  await prisma.courseBoundPoQuestionBinding.deleteMany({
    where: { course_bound_evaluation_id: rows.evaluationId },
  });
  await prisma.courseBoundEvaluation.deleteMany({ where: { id: rows.evaluationId } });
  await prisma.courseAssignment.deleteMany({ where: { id: rows.assignmentId } });
  await prisma.instrumentTemplate.deleteMany({ where: { id: rows.templateId } });
  await prisma.pO.deleteMany({ where: { program_id: rows.programId } });
  await prisma.course.deleteMany({ where: { id: rows.courseId } });
  await prisma.program.deleteMany({ where: { id: rows.programId } });
}

describe.skipIf(!process.env.DATABASE_URL || process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1")(
  "Course-bound PO question binding invariants",
  () => {
    it("stores one PO bound to several questions and several POs bound to one question", async () => {
      const rows = await seedOwnedRows();
      const [firstGo, secondGo] = rows.poIds;

      try {
        await prisma.courseBoundPoQuestionBinding.createMany({
          data: [
            bindingFor(rows, { poId: firstGo, itemKey: "q1" }),
            bindingFor(rows, { poId: firstGo, itemKey: "q2" }),
            bindingFor(rows, { poId: secondGo, itemKey: "q1" }),
          ],
        });

        const stored = await prisma.courseBoundPoQuestionBinding.findMany({
          where: { course_bound_evaluation_id: rows.evaluationId },
          select: { po_id: true, item_key: true },
        });
        expect(stored).toHaveLength(3);
        expect(
          stored.filter((binding) => binding.po_id === firstGo).map((binding) => binding.item_key)
        ).toEqual(["q1", "q2"]);
        expect(stored.filter((binding) => binding.item_key === "q1")).toHaveLength(2);
      } finally {
        await cleanupOwnedRows(rows);
      }
    }, 30000);

    it("rejects a duplicate (evaluation, PO, question) pair", async () => {
      const rows = await seedOwnedRows();
      const [firstGo] = rows.poIds;

      try {
        const binding = bindingFor(rows, { poId: firstGo, itemKey: "q1" });
        await prisma.courseBoundPoQuestionBinding.create({ data: binding });

        await expect(
          prisma.courseBoundPoQuestionBinding.create({ data: binding })
        ).rejects.toSatisfy(isUniqueConstraintError);
      } finally {
        await cleanupOwnedRows(rows);
      }
    }, 30000);

    it("keeps the frozen snapshot when its PO is deleted", async () => {
      const rows = await seedOwnedRows();
      const [firstGo] = rows.poIds;

      try {
        await prisma.courseBoundPoQuestionBinding.create({
          data: {
            ...bindingFor(rows, { poId: firstGo, itemKey: "q1" }),
            po_code_snapshot: "BTPO1",
          },
        });

        await prisma.pO.delete({ where: { id: firstGo } });

        const stored = await prisma.courseBoundPoQuestionBinding.findFirstOrThrow({
          where: { course_bound_evaluation_id: rows.evaluationId },
        });
        expect(stored.po_id).toBeNull();
        expect(stored.po_code_snapshot).toBe("BTPO1");
        expect(stored.po_description_snapshot).toBe("Snapshot description");
      } finally {
        await cleanupOwnedRows(rows);
      }
    }, 30000);

    it("deletes the published bindings with their evaluation", async () => {
      const rows = await seedOwnedRows();

      try {
        await prisma.courseBoundPoQuestionBinding.create({
          data: bindingFor(rows, { poId: rows.poIds[0], itemKey: "q1" }),
        });

        await prisma.courseBoundEvaluation.delete({ where: { id: rows.evaluationId } });

        await expect(
          prisma.courseBoundPoQuestionBinding.count({
            where: { course_bound_evaluation_id: rows.evaluationId },
          })
        ).resolves.toBe(0);
      } finally {
        await cleanupOwnedRows(rows);
      }
    }, 30000);
  }
);
