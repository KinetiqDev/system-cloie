import { EvaluationTemplateType, Prisma } from "@prisma/client";
import { prisma } from "../../../src/lib/db/prisma";
import { U } from "../constants/ids";
import { ciloEvalStructure } from "../fixtures/instruments";
import type { FoundationContext } from "../types";
import type { TemplateStructure } from "../../../src/features/instruments/types";

/**
 * Publication-slice fixture (issue #546): a faculty-owned Course-bound
 * template for the demo Faculty bound to GESTECH, with every GESTECH CILO
 * assigned to a Likert question and an active frozen version. The Faculty
 * publish journey (`/faculty/tools` → `/faculty/cilo-evaluations/new`) can
 * only publish through a template owned by the signed-in Faculty member
 * (`getFacultyTemplatePublicationContext` requires `faculty_owner_id`), and
 * no such template existed in the seed. GESTECH is a General Education
 * course whose active CILOs carry active Institutional Outcome alignments,
 * so the typed publication alignment gate passes for it.
 *
 * One CILO is evidenced by two Likert questions (issue #626), so the fixture
 * exercises the real one-to-many publication path: the extra question sits in
 * the second section, which no wizard or visual-baseline shot renders first,
 * and the reused CILO's pair is pinned in `e2e/support/contract.ts`.
 *
 * The template is discovered in the e2e global setup by its deterministic
 * code; its id is a runtime navigation handle, not an identifier under test.
 */

const FACULTY_TEMPLATE_CODE = "FAC_GESTECH";
const EXPECTED_GESTECH_CILO_COUNT = 3;

/** The second Likert question evidencing the first GESTECH CILO. */
const REUSED_CILO_SECTION_KEY = "overall-attainment";
const REUSED_CILO_ITEM_KEY = "overall-attainment-2";
const REUSED_CILO_PROMPT = "I achieved the first course intended learning outcome in applied work.";

/**
 * The CILO_EVAL structure plus one Likert question that re-evidences the first
 * CILO. Kept local to this fixture so the shared institutional structure, and
 * every deployment snapshotted from it, is unchanged.
 */
const facultyPublicationStructure: TemplateStructure = ciloEvalStructure.map((section) =>
  section.key === REUSED_CILO_SECTION_KEY
    ? {
        ...section,
        questions: [
          ...section.questions,
          {
            key: REUSED_CILO_ITEM_KEY,
            prompt: REUSED_CILO_PROMPT,
            type: "likert",
            order: section.questions.length + 1,
            required: true,
            likertDescriptors: [...section.questions[0]!.likertDescriptors!],
          },
        ],
      }
    : section
);

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
  const structureJson = facultyPublicationStructure as unknown as Prisma.InputJsonValue;
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
  const structureJson = facultyPublicationStructure as unknown as Prisma.InputJsonValue;
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
  // Each GESTECH CILO is bound to its `cilo-items` Likert question, and the
  // first CILO is also bound to the extra `overall-attainment` question, so the
  // fixture carries more bindings than CILOs (issue #626).
  const bindings: Array<{
    sectionKey: string;
    itemKey: string;
    prompt: string;
    ciloIndex: number;
  }> = cilos.map((_cilo, index) => ({
    sectionKey: "cilo-items",
    itemKey: `cilo-attainment-${index + 1}`,
    prompt:
      index === 0
        ? "I achieved the first course intended learning outcome."
        : index === 1
          ? "I achieved the second course intended learning outcome."
          : "I achieved the third course intended learning outcome.",
    ciloIndex: index,
  }));
  bindings.push({
    sectionKey: REUSED_CILO_SECTION_KEY,
    itemKey: REUSED_CILO_ITEM_KEY,
    prompt: REUSED_CILO_PROMPT,
    ciloIndex: 0,
  });

  for (const binding of bindings) {
    const cilo = cilos[binding.ciloIndex]!;
    const data = {
      cilo_id: cilo.id,
      cilo_description_snapshot: cilo.description,
      section_key: binding.sectionKey,
      item_key: binding.itemKey,
      question_prompt_snapshot: binding.prompt,
    };
    await prisma.instrumentTemplateCiloQuestionBinding.upsert({
      where: {
        template_id_section_key_item_key: {
          template_id: templateId,
          section_key: binding.sectionKey,
          item_key: binding.itemKey,
        },
      },
      update: data,
      create: { ...data, template_id: templateId },
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
