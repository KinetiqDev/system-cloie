import { EvaluationTemplateType } from "@prisma/client";
import { prisma } from "../../../src/lib/db/prisma";
import { upsertTemplate } from "../helpers/templates";
import {
  alumniEvalStructure,
  ciloEvalStructure,
  exitSurveyStructure,
  industryEvalStructure,
} from "../fixtures/instruments";

export async function seedInstruments() {
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
  await prisma.instrumentTemplatePloQuestionBinding.deleteMany({
    where: { template_id: { in: [alumniTemplate.id, industryTemplate.id] } },
  });
}
