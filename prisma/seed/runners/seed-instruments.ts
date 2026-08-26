import { EvaluationTemplateType } from "@prisma/client";
import { prisma } from "../../../src/lib/db/prisma";
import { upsertTemplate } from "../helpers/templates";
import {
  alumniEvalStructure,
  ciloEvalStructure,
  exitSurveyStructure,
  industryEvalStructure,
} from "../fixtures/instruments";
import { listTemplateLikertQuestions } from "../../../src/features/instruments/types";
import type { TemplateStructure } from "../types";
import type { FoundationContext, OutcomeContext } from "../types";

export async function seedInstruments(
  outcomeContext?: OutcomeContext,
  foundationContext?: Pick<FoundationContext, "pMap">
) {
  console.log("  → Instrument Templates...");
  await upsertTemplate(
    "CILO_EVAL",
    "Course-Bound CILO Evaluation",
    "Post-term course intended learning outcomes evaluation tool for faculty-managed CILO evaluations.",
    ciloEvalStructure,
    EvaluationTemplateType.COURSE_BOUND,
    true
  );
  await upsertTemplate(
    "EXIT_SURVEY",
    "Graduating Student Exit Survey",
    "Graduating student exit survey gathering feedback on academic experience, outcomes, facilities, and formation.",
    exitSurveyStructure,
    EvaluationTemplateType.PROGRAM_WIDE
  );
  const alumniTemplate = await upsertTemplate(
    "ALUMNI_EVAL",
    "Alumni Evaluation Tool",
    "Alumni evaluation tool assessing graduate outcomes attainment, employment readiness, and program satisfaction.",
    alumniEvalStructure,
    EvaluationTemplateType.PROGRAM_WIDE
  );
  const industryTemplate = await upsertTemplate(
    "INDUSTRY_EVAL",
    "Industry Partner Internship Evaluation Tool",
    "Industry partner evaluation tool assessing intern knowledge, skills, professional traits, and graduate readiness.",
    industryEvalStructure,
    EvaluationTemplateType.PROGRAM_WIDE
  );

  if (outcomeContext && foundationContext) {
    await seedAlumniIndustryPloBindings(
      outcomeContext,
      foundationContext,
      alumniTemplate.id,
      industryTemplate.id
    );
  }
}

async function seedAlumniIndustryPloBindings(
  _outcomeContext: OutcomeContext,
  foundationContext: Pick<FoundationContext, "pMap">,
  alumniTemplateId: string,
  industryTemplateId: string
) {
  const bsitProgram = foundationContext.pMap.get("BSIT");
  if (!bsitProgram) return;
  const bsitPlos = await prisma.pLO.findMany({
    where: { program_id: bsitProgram.id, is_active: true },
    orderBy: { code: "asc" },
    select: { id: true, code: true, description: true },
  });
  if (bsitPlos.length === 0) return;

  const bindLikertQuestions = async (templateId: string, structure: TemplateStructure) => {
    const questions = listTemplateLikertQuestions(structure);
    const desiredKeys = new Set(
      questions.map((question, index) => {
        const plo = bsitPlos[index % bsitPlos.length];
        return `${question.sectionKey}|${question.itemKey}|${plo.id}`;
      })
    );
    for (let index = 0; index < questions.length; index++) {
      const question = questions[index];
      const plo = bsitPlos[index % bsitPlos.length];
      await prisma.instrumentTemplatePloQuestionBinding.upsert({
        where: {
          template_id_plo_id_section_key_item_key: {
            template_id: templateId,
            plo_id: plo.id,
            section_key: question.sectionKey,
            item_key: question.itemKey,
          },
        },
        update: {
          plo_code_snapshot: plo.code,
          plo_description_snapshot: plo.description,
          question_prompt_snapshot: question.prompt,
        },
        create: {
          template_id: templateId,
          plo_id: plo.id,
          plo_code_snapshot: plo.code,
          plo_description_snapshot: plo.description,
          section_key: question.sectionKey,
          item_key: question.itemKey,
          question_prompt_snapshot: question.prompt,
        },
      });
    }
    // Delete stale bindings that no longer match the current structure or PLO set
    const existing = await prisma.instrumentTemplatePloQuestionBinding.findMany({
      where: { template_id: templateId },
      select: { id: true, section_key: true, item_key: true, plo_id: true },
    });
    const staleIds = existing
      .filter((row) => !desiredKeys.has(`${row.section_key}|${row.item_key}|${row.plo_id}`))
      .map((row) => row.id);
    if (staleIds.length > 0) {
      await prisma.instrumentTemplatePloQuestionBinding.deleteMany({
        where: { id: { in: staleIds } },
      });
    }
  };

  console.log("  → Alumni/Industry PLO question bindings (BSIT)...");
  await bindLikertQuestions(alumniTemplateId, alumniEvalStructure);
  await bindLikertQuestions(industryTemplateId, industryEvalStructure);
}
