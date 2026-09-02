import { EvaluationTemplateType, Prisma } from "@prisma/client";
import { prisma } from "../../../src/lib/db/prisma";
import { upsertTemplate } from "../helpers/templates";
import {
  alumniEvalStructure,
  ciloEvalStructure,
  exitSurveyStructure,
  industryEvalStructure,
} from "../fixtures/instruments";
import { listTemplateLikertQuestions } from "../../../src/features/instruments/types";
import type { FoundationContext, OutcomeContext, TemplateStructure } from "../types";

export async function seedInstruments(
  _outcomeContext?: OutcomeContext,
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
  await upsertTemplate(
    "ALUMNI_EVAL",
    "Alumni Evaluation Tool",
    "Alumni evaluation tool assessing graduate outcomes attainment, employment readiness, and program satisfaction.",
    alumniEvalStructure,
    EvaluationTemplateType.PROGRAM_WIDE
  );
  await upsertTemplate(
    "INDUSTRY_EVAL",
    "Industry Partner Internship Evaluation Tool",
    "Industry partner evaluation tool assessing intern knowledge, skills, professional traits, and graduate readiness.",
    industryEvalStructure,
    EvaluationTemplateType.PROGRAM_WIDE
  );

  const bsitProgram = foundationContext?.pMap.get("BSIT");
  if (!bsitProgram) return;
  await upsertProgramPublicationTemplate({
    code: "BSIT_ALUMNI_EVAL",
    name: "BSIT Alumni Evaluation Tool",
    description: "BSIT-owned Alumni evaluation tool with Program Learning Outcome bindings.",
    programId: bsitProgram.id,
    structure: alumniEvalStructure,
  });
  await upsertProgramPublicationTemplate({
    code: "BSIT_INDUSTRY_EVAL",
    name: "BSIT Industry Partner Internship Evaluation Tool",
    description:
      "BSIT-owned Industry Partner evaluation tool with Program Learning Outcome bindings.",
    programId: bsitProgram.id,
    structure: industryEvalStructure,
  });
}

async function upsertProgramPublicationTemplate(input: {
  code: string;
  name: string;
  description: string;
  programId: string;
  structure: TemplateStructure;
}) {
  const structureJson = input.structure as unknown as Prisma.InputJsonValue;
  const template = await prisma.instrumentTemplate.upsert({
    where: { code: input.code },
    update: {
      name: input.name,
      description: input.description,
      is_active: true,
      program_id: input.programId,
      template_type: EvaluationTemplateType.PROGRAM_WIDE,
      structure: structureJson,
    },
    create: {
      code: input.code,
      name: input.name,
      description: input.description,
      is_active: true,
      program_id: input.programId,
      template_type: EvaluationTemplateType.PROGRAM_WIDE,
      structure: structureJson,
    },
  });
  await prisma.instrumentVersion.upsert({
    where: { template_id_version_number: { template_id: template.id, version_number: 1 } },
    update: { is_active: true, structure_snapshot: structureJson },
    create: {
      template_id: template.id,
      version_number: 1,
      is_active: true,
      structure_snapshot: structureJson,
    },
  });

  const plos = await prisma.pLO.findMany({
    where: { program_id: input.programId, is_active: true },
    orderBy: { code: "asc" },
    select: { id: true, code: true, description: true },
  });
  const questions = listTemplateLikertQuestions(input.structure);
  await prisma.instrumentTemplatePloQuestionBinding.deleteMany({
    where: { template_id: template.id },
  });
  if (plos.length === 0) return;
  await prisma.instrumentTemplatePloQuestionBinding.createMany({
    data: questions.map((question, index) => {
      const plo = plos[index % plos.length];
      return {
        template_id: template.id,
        plo_id: plo.id,
        plo_code_snapshot: plo.code,
        plo_description_snapshot: plo.description,
        section_key: question.sectionKey,
        item_key: question.itemKey,
        question_prompt_snapshot: question.prompt,
      };
    }),
  });
}
