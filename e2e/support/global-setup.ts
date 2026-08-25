import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../../src/lib/db/prisma";
import { E2E_CONTRACT, type FixtureData } from "./contract";

export const FIXTURE_DATA_PATH = join(__dirname, "..", ".fixture-data.json");

export type { FixtureData } from "./contract";

function assertContract(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Fixture contract violation: ${message}`);
  }
}

async function findProgramByCode(code: string) {
  const program = await prisma.program.findUnique({ where: { code } });
  assertContract(program, `missing seeded program "${code}"`);
  return { id: program!.id, code: program!.code };
}

async function findSubmittedResponse(courseBoundEvaluationId: string, deploymentName: string) {
  const response = await prisma.response.findFirst({
    where: { status: "SUBMITTED", assignment: { course_bound_id: courseBoundEvaluationId } },
    orderBy: { submitted_at: "asc" },
    select: { id: true, assignment: { select: { respondent: { select: { name: true } } } } },
  });
  assertContract(response, `missing SUBMITTED response for "${deploymentName}"`);
  return {
    id: response!.id,
    respondentName: response!.assignment.respondent.name,
  };
}

async function verifyIdentities(): Promise<void> {
  const contract = E2E_CONTRACT;
  const demoPh = await prisma.user.findUnique({ where: { id: contract.demoPh.id } });
  assertContract(demoPh, `missing seeded SystemRole user ${contract.demoPh.id} (${contract.demoPh.email})`);
  assertContract(demoPh?.email === contract.demoPh.email, `seeded user ${contract.demoPh.email} email drift: got "${demoPh?.email}"`);
  const demoPhRole = await prisma.userRole.findUnique({ where: { user_id: contract.demoPh.id } });
  assertContract(demoPhRole?.role === "PROGRAM_HEAD", `seeded user ${contract.demoPh.email} role is not PROGRAM_HEAD (got "${demoPhRole?.role}")`);

  const beedPh = await prisma.user.findUnique({ where: { id: contract.beedPh.id } });
  assertContract(beedPh, `missing seeded SystemRole user ${contract.beedPh.id} (${contract.beedPh.email})`);
  assertContract(beedPh?.email === contract.beedPh.email, `seeded user ${contract.beedPh.email} email drift: got "${beedPh?.email}"`);
}

async function verifyDeployments(): Promise<{
  courseEvaluation: { id: string; deployment_name: string };
  bottomUpEvaluation: { id: string; deployment_name: string };
  centralEvaluation: { id: string; deployment_name: string };
}> {
  const contract = E2E_CONTRACT;
  const courseEvaluation = await prisma.courseBoundEvaluation.findUnique({
    where: { id: contract.deployments.courseEvaluation.id },
  });
  assertContract(
    courseEvaluation,
    `missing seeded Course-bound evaluation "${contract.deployments.courseEvaluation.title}" (${contract.deployments.courseEvaluation.id})`
  );
  assertContract(
    courseEvaluation?.deployment_name === contract.deployments.courseEvaluation.title,
    `Course-bound evaluation ${contract.deployments.courseEvaluation.id} title drift: got "${courseEvaluation?.deployment_name}"`
  );

  const bottomUpEvaluation = await prisma.courseBoundEvaluation.findUnique({
    where: { id: contract.deployments.bottomUpEvaluation.id },
  });
  assertContract(
    bottomUpEvaluation,
    `missing seeded Course-bound evaluation "${contract.deployments.bottomUpEvaluation.title}" (${contract.deployments.bottomUpEvaluation.id})`
  );
  assertContract(
    bottomUpEvaluation?.deployment_name === contract.deployments.bottomUpEvaluation.title,
    `Course-bound evaluation ${contract.deployments.bottomUpEvaluation.id} title drift: got "${bottomUpEvaluation?.deployment_name}"`
  );

  const centralEvaluation = await prisma.centralDeployment.findUnique({
    where: { id: contract.deployments.centralEvaluation.id },
  });
  assertContract(
    centralEvaluation,
    `missing seeded Central deployment "${contract.deployments.centralEvaluation.title}" (${contract.deployments.centralEvaluation.id})`
  );
  assertContract(
    centralEvaluation?.deployment_name === contract.deployments.centralEvaluation.title,
    `Central deployment ${contract.deployments.centralEvaluation.id} title drift: got "${centralEvaluation?.deployment_name}"`
  );

  return { courseEvaluation, bottomUpEvaluation, centralEvaluation };
}

async function verifyResponseExpectations(
  courseResponse: { id: string; respondentName: string },
  bottomUpResponse: { id: string; respondentName: string }
): Promise<void> {
  const contract = E2E_CONTRACT;
  assertContract(
    courseResponse.respondentName === contract.courseResponse.respondentName,
    `IT201 response respondent drift: expected "${contract.courseResponse.respondentName}", got "${courseResponse.respondentName}"`
  );
  assertContract(
    bottomUpResponse.respondentName === contract.bottomUpResponse.respondentName,
    `ITRES1 response respondent drift: expected "${contract.bottomUpResponse.respondentName}", got "${bottomUpResponse.respondentName}"`
  );

  const quantitativeContract = contract.courseResponse.quantitative[0];
  const quantitativeItem = await prisma.quantitativeResponseItem.findFirst({
    where: {
      response_id: courseResponse.id,
      section_key: "cilo-items",
      item_key: "cilo-attainment-1",
    },
  });
  assertContract(
    quantitativeItem?.rating_value === quantitativeContract.rating,
    `IT201 response rating drift: expected "${quantitativeContract.rating}" for "${quantitativeContract.prompt}", got "${quantitativeItem?.rating_value}"`
  );

  const promptBinding = await prisma.courseBoundCiloQuestionBinding.findFirst({
    where: {
      course_bound_evaluation_id: contract.deployments.courseEvaluation.id,
      section_key: "cilo-items",
      item_key: "cilo-attainment-1",
    },
  });
  assertContract(
    promptBinding?.question_prompt_snapshot === quantitativeContract.prompt,
    `IT201 question prompt drift: expected "${quantitativeContract.prompt}", got "${promptBinding?.question_prompt_snapshot}"`
  );

  const qualitativeContract = contract.courseResponse.qualitative[0];
  const qualitativeItem = await prisma.qualitativeResponseItem.findFirst({
    where: { response_id: courseResponse.id, section_key: "qualitative", prompt_key: "qualitative-1" },
  });
  assertContract(
    qualitativeItem?.text_content === qualitativeContract.text,
    `IT201 qualitative answer drift: expected "${qualitativeContract.text}", got "${qualitativeItem?.text_content}"`
  );
}

async function verifyPloEvidenceLink(programId: string): Promise<string> {
  const contract = E2E_CONTRACT;
  const ploLinkContract = contract.bottomUpResponse.ploLinks[0];
  const firstBinding = await prisma.courseBoundCiloQuestionBinding.findFirst({
    where: { course_bound_evaluation_id: contract.deployments.bottomUpEvaluation.id },
    orderBy: { item_key: "asc" },
    select: { cilo: { select: { id: true, description: true } } },
  });
  assertContract(
    firstBinding?.cilo?.description === ploLinkContract.ciloLabel,
    `ITRES1 bottom-up CILO label drift: expected "${ploLinkContract.ciloLabel}", got "${firstBinding?.cilo?.description}"`
  );
  const ploMapping = firstBinding?.cilo
    ? await prisma.cILOMapping.findFirst({
        where: { cilo_id: firstBinding.cilo.id, plo: { code: ploLinkContract.ploCode } },
      })
    : null;
  assertContract(
    ploMapping,
    `missing bottom-up PLO evidence link: "${ploLinkContract.ploCode}" not mapped for "${contract.deployments.bottomUpEvaluation.title}"`
  );

  // Discover the reviewed PLO's runtime handle so the journey can assert the
  // exact evidence link without deriving the expected ploId from the read
  // under test. The ploCode is the reviewed contract; ploId is the handle.
  const plo = await prisma.pLO.findUnique({
    where: { program_id_code: { program_id: programId, code: ploLinkContract.ploCode } },
  });
  assertContract(plo, `missing seeded PLO "${ploLinkContract.ploCode}"`);
  return plo.id;
}

export default async function globalSetup(): Promise<void> {
  await verifyIdentities();
  const deployments = await verifyDeployments();

  const [bsit, beed] = await Promise.all([
    findProgramByCode("BSIT"),
    findProgramByCode("BEED"),
  ]);

  const [courseResponse, bottomUpResponse] = await Promise.all([
    findSubmittedResponse(deployments.courseEvaluation.id, deployments.courseEvaluation.deployment_name),
    findSubmittedResponse(deployments.bottomUpEvaluation.id, deployments.bottomUpEvaluation.deployment_name),
  ]);

  await verifyResponseExpectations(courseResponse, bottomUpResponse);
  const ploId = await verifyPloEvidenceLink(bsit.id);

  const contract = E2E_CONTRACT;
  const fixture: FixtureData = {
    demoPh: { id: contract.demoPh.id, email: contract.demoPh.email },
    beedPh: { id: contract.beedPh.id, email: contract.beedPh.email },
    bsit,
    beed,
    courseEvaluation: {
      id: contract.deployments.courseEvaluation.id,
      title: contract.deployments.courseEvaluation.title,
    },
    courseResponse: {
      id: courseResponse.id,
      respondentName: contract.courseResponse.respondentName,
      quantitative: contract.courseResponse.quantitative.map((q) => ({
        prompt: q.prompt,
        rating: q.rating,
      })),
      qualitative: contract.courseResponse.qualitative.map((q) => ({ text: q.text })),
    },
    centralEvaluation: {
      id: contract.deployments.centralEvaluation.id,
      title: contract.deployments.centralEvaluation.title,
    },
    bottomUpEvaluation: {
      id: contract.deployments.bottomUpEvaluation.id,
      title: contract.deployments.bottomUpEvaluation.title,
    },
    bottomUpResponse: {
      id: bottomUpResponse.id,
      respondentName: contract.bottomUpResponse.respondentName,
      ploLinks: contract.bottomUpResponse.ploLinks.map((p) => ({
        ploId,
        ploCode: p.ploCode,
        ciloLabel: p.ciloLabel,
      })),
    },
  };

  mkdirSync(join(__dirname, ".."), { recursive: true });
  writeFileSync(FIXTURE_DATA_PATH, JSON.stringify(fixture, null, 2));
  await prisma.$disconnect();
  console.log("Fixture data discovered:", FIXTURE_DATA_PATH);
}
