import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../../src/lib/db/prisma";

export const FIXTURE_DATA_PATH = join(__dirname, "..", ".fixture-data.json");

export type FixtureData = {
  bsit: { id: string; code: string };
  beed: { id: string; code: string };
  /** Course evaluation used by journey A (top-down). */
  courseEvaluation: { id: string; title: string };
  /** The single SUBMITTED response of the course evaluation (journey A). */
  courseResponse: {
    id: string;
    respondentName: string;
    quantitative: Array<{ prompt: string; rating: number }>;
    qualitative: Array<{ text: string }>;
  };
  /** Program-wide evaluation (cross-Program denial anchor). */
  centralEvaluation: { id: string; title: string };
  /** ITRES1 evaluation used by journey B (bottom-up): response → CILO → PLO. */
  bottomUpEvaluation: { id: string; title: string };
  bottomUpResponse: {
    id: string;
    respondentName: string;
    ploLinks: Array<{ ploId: string; ploCode: string; ciloLabel: string }>;
  };
  demoPh: { id: string; email: string };
  beedPh: { id: string; email: string };
};

async function discoverFixture(): Promise<FixtureData> {
  const [bsit, beed] = await Promise.all([
    prisma.program.findUniqueOrThrow({ where: { code: "BSIT" } }),
    prisma.program.findUniqueOrThrow({ where: { code: "BEED" } }),
  ]);

  const [courseEvaluation, bottomUpEvaluation] = await Promise.all([
    prisma.courseBoundEvaluation.findFirstOrThrow({
      where: { deployment_name: "IT201 Post-Term CILO Evaluation" },
      select: { id: true, deployment_name: true },
    }),
    prisma.courseBoundEvaluation.findFirstOrThrow({
      where: { deployment_name: "ITRES1 Post-Term CILO Evaluation" },
      select: { id: true, deployment_name: true },
    }),
  ]);

  const centralEvaluation = await prisma.centralDeployment.findFirstOrThrow({
    where: { deployment_name: "BSIT Alumni Evaluation" },
    select: { id: true, deployment_name: true },
  });

  const findSubmittedResponse = async (evaluationId: string) => {
    const response = await prisma.response.findFirstOrThrow({
      where: {
        status: "SUBMITTED",
        assignment: { course_bound_id: evaluationId },
      },
      select: {
        id: true,
        assignment: { select: { respondent: { select: { name: true } } } },
      },
      orderBy: { submitted_at: "asc" },
    });
    return { id: response.id, respondentName: response.assignment.respondent.name };
  };

  const [courseResponse, bottomUpResponse] = await Promise.all([
    findSubmittedResponse(courseEvaluation.id),
    findSubmittedResponse(bottomUpEvaluation.id),
  ]);

  const [quantitative, qualitative] = await Promise.all([
    prisma.quantitativeResponseItem.findMany({
      where: { response_id: courseResponse.id },
      select: { item_key: true, rating_value: true },
      orderBy: [{ section_key: "asc" }, { item_key: "asc" }],
    }),
    prisma.qualitativeResponseItem.findMany({
      where: { response_id: courseResponse.id },
      select: { text_content: true },
      orderBy: { prompt_key: "asc" },
    }),
  ]);

  // Bindings for the bottom-up evaluation: item → CILO → PLO mapping chain.
  const bindings = await prisma.courseBoundCiloQuestionBinding.findMany({
    where: { course_bound_evaluation_id: bottomUpEvaluation.id },
    select: {
      item_key: true,
      cilo: {
        select: {
          description: true,
          cilo_mappings: {
            where: { plo: { program_id: bsit.id } },
            select: { plo: { select: { id: true, code: true } } },
          },
        },
      },
    },
    orderBy: { item_key: "asc" },
  });

  const ploLinks = bindings.flatMap((binding) =>
    (binding.cilo?.cilo_mappings ?? []).map((mapping) => ({
      ploId: mapping.plo.id,
      ploCode: mapping.plo.code,
      ciloLabel: binding.cilo?.description ?? binding.item_key,
    }))
  );

  const [demoPh, beedPh] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: "demo-ph@cloie.test" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "ph-beed@cloie.test" } }),
  ]);

  const promptByItemKey = await prisma.courseBoundCiloQuestionBinding.findMany({
    where: { course_bound_evaluation_id: courseEvaluation.id },
    select: { item_key: true, question_prompt_snapshot: true },
  });
  const promptByKey: Record<string, string> = Object.fromEntries(
    promptByItemKey.map((b) => [b.item_key, b.question_prompt_snapshot])
  );

  return {
    bsit: { id: bsit.id, code: bsit.code },
    beed: { id: beed.id, code: beed.code },
    courseEvaluation: { id: courseEvaluation.id, title: courseEvaluation.deployment_name },
    courseResponse: {
      id: courseResponse.id,
      respondentName: courseResponse.respondentName,
      quantitative: quantitative.map((item) => ({
        prompt: promptByKey[item.item_key] ?? item.item_key,
        rating: item.rating_value,
      })),
      qualitative: qualitative.map((item) => ({ text: item.text_content })),
    },
    centralEvaluation: { id: centralEvaluation.id, title: centralEvaluation.deployment_name },
    bottomUpEvaluation: { id: bottomUpEvaluation.id, title: bottomUpEvaluation.deployment_name },
    bottomUpResponse: {
      id: bottomUpResponse.id,
      respondentName: bottomUpResponse.respondentName,
      ploLinks,
    },
    demoPh: { id: demoPh.id, email: demoPh.email },
    beedPh: { id: beedPh.id, email: beedPh.email },
  };
}

export default async function globalSetup(): Promise<void> {
  const fixture = await discoverFixture();
  mkdirSync(join(__dirname, ".."), { recursive: true });
  writeFileSync(FIXTURE_DATA_PATH, JSON.stringify(fixture, null, 2));
  await prisma.$disconnect();
  console.log("Fixture data discovered:", FIXTURE_DATA_PATH);
}
