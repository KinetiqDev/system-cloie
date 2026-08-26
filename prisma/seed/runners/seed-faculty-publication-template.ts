import { EvaluationTemplateType, Prisma } from "@prisma/client";
import { prisma } from "../../../src/lib/db/prisma";
import { U } from "../constants/ids";
import { ciloEvalStructure } from "../fixtures/instruments";
import type { FoundationContext } from "../types";

/**
 * Publication-slice fixture (issue #546): a faculty-owned Course-bound
 * template for the demo Faculty bound to GESTECH, with every GESTECH CILO
 * assigned to one Likert question and an active frozen version. The Faculty
 * publish journey (`/faculty/tools` → `/faculty/cilo-evaluations/new`) can
 * only publish through a template owned by the signed-in Faculty member
 * (`getFacultyTemplatePublicationContext` requires `faculty_owner_id`), and
 * no such template existed in the seed. GESTECH is a General Education
 * course whose active CILOs carry active Institutional Outcome alignments,
 * so the typed publication alignment gate passes for it.
 *
 * The template is discovered in the e2e global setup by its deterministic
 * code; its id is a runtime navigation handle, not an identifier under test.
 */

const FACULTY_TEMPLATE_CODE = "FAC_GESTECH";
const EXPECTED_GESTECH_CILO_COUNT = 3;

async function resolveGestechCilos(courseId: string) {
  const cilos = await prisma.cILO.findMany({
    where: { course_id: courseId, is_active: true },
    orderBy: { created_at: "asc" },
    select: { id: true, description: true },
  });
  if (cilos.length !== EXPECTED_GESTECH_CILO_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_GESTECH_CILO_COUNT} active GESTECH CILOs for the faculty publication template, found ${cilos.length}`
    );
  }
  return cilos;
}

async function upsertFacultyTemplate(courseId: string): Promise<{ id: string }> {
  const structureJson = ciloEvalStructure as unknown as Prisma.InputJsonValue;
  return prisma.instrumentTemplate.upsert({
    where: { code: FACULTY_TEMPLATE_CODE },
    update: {
      name: "GESTECH Faculty CILO Evaluation",
      description: "Faculty-owned Course-bound template bound to GESTECH.",
      structure: structureJson,
      is_active: true,
      is_faculty_accessible: false,
      faculty_owner_id: U.FAC_BSIT,
      bound_course_id: courseId,
      bound_program_id: null,
      bound_major_id: null,
      template_type: EvaluationTemplateType.COURSE_BOUND,
    },
    create: {
      code: FACULTY_TEMPLATE_CODE,
      name: "GESTECH Faculty CILO Evaluation",
      description: "Faculty-owned Course-bound template bound to GESTECH.",
      structure: structureJson,
      is_active: true,
      is_faculty_accessible: false,
      faculty_owner_id: U.FAC_BSIT,
      bound_course_id: courseId,
      bound_program_id: null,
      bound_major_id: null,
      template_type: EvaluationTemplateType.COURSE_BOUND,
    },
  });
}

async function upsertFacultyTemplateVersion(templateId: string): Promise<void> {
  const structureJson = ciloEvalStructure as unknown as Prisma.InputJsonValue;
  await prisma.instrumentVersion.upsert({
    where: { template_id_version_number: { template_id: templateId, version_number: 1 } },
    update: { is_active: true, structure_snapshot: structureJson },
    create: {
      template_id: templateId,
      version_number: 1,
      is_active: true,
      structure_snapshot: structureJson,
    },
  });
}

async function bindGestechCilos(
  templateId: string,
  cilos: Array<{ id: string; description: string }>
): Promise<void> {
  // Bind each GESTECH CILO to its Likert question, mirroring the CILO_EVAL
  // structure used by every seeded Course-bound deployment.
  for (const [index, cilo] of cilos.entries()) {
    const itemKey = `cilo-attainment-${index + 1}`;
    const prompt =
      index === 0
        ? "I achieved the first course intended learning outcome."
        : index === 1
          ? "I achieved the second course intended learning outcome."
          : "I achieved the third course intended learning outcome.";
    await prisma.instrumentTemplateCiloQuestionBinding.upsert({
      where: {
        template_id_cilo_id: { template_id: templateId, cilo_id: cilo.id },
      },
      update: {
        cilo_description_snapshot: cilo.description,
        section_key: "cilo-items",
        item_key: itemKey,
        question_prompt_snapshot: prompt,
      },
      create: {
        template_id: templateId,
        cilo_id: cilo.id,
        cilo_description_snapshot: cilo.description,
        section_key: "cilo-items",
        item_key: itemKey,
        question_prompt_snapshot: prompt,
      },
    });
  }
}

export async function seedFacultyPublicationTemplate({
  cMap,
}: Pick<FoundationContext, "cMap">): Promise<void> {
  console.log("  → Faculty publication template (GESTECH)...");

  const gestech = cMap.get("GESTECH");
  if (!gestech) {
    throw new Error("Missing GESTECH course for faculty publication template fixture");
  }

  const cilos = await resolveGestechCilos(gestech.id);
  const template = await upsertFacultyTemplate(gestech.id);
  await upsertFacultyTemplateVersion(template.id);
  await bindGestechCilos(template.id, cilos);
}
