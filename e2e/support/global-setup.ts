import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { StudentSection, YearLevel } from "@prisma/client";
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

/**
 * Locates a seeded Course Assignment by its deterministic seed definition
 * inside the ACTIVE academic period. The assignment id itself is a runtime
 * navigation handle, not an identifier under test.
 */
async function findCourseAssignmentByDefinition(
  definition: (typeof E2E_CONTRACT.rosterAssignments)[keyof typeof E2E_CONTRACT.rosterAssignments]
) {
  const assignment = await prisma.courseAssignment.findFirst({
    where: {
      is_active: true,
      term_instance: { status: "ACTIVE" },
      course: { code: definition.courseCode },
      program: { code: definition.programCode },
      year_level: definition.yearLevel as YearLevel,
      section: definition.section as StudentSection,
    },
    select: {
      id: true,
      faculty: { select: { id: true } },
      course: { select: { code: true } },
      program: { select: { code: true } },
      course_bound_evaluations: {
        where: { published_at: { not: null } },
        select: { id: true },
        take: 1,
      },
    },
  });
  assertContract(
    assignment,
    `missing seeded Course assignment ${definition.courseCode} ${definition.programCode} ${definition.yearLevel} ${definition.section}`
  );
  return {
    id: assignment!.id,
    courseCode: assignment!.course.code,
    programCode: assignment!.program.code,
    facultyId: assignment!.faculty.id,
    hasPublishedEvaluation: assignment!.course_bound_evaluations.length > 0,
  };
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

async function verifySeededIdentity(
  contract: { id: string; email: string },
  expectedRole: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: contract.id } });
  assertContract(user, `missing seeded SystemRole user ${contract.id} (${contract.email})`);
  assertContract(
    user?.email === contract.email,
    `seeded user ${contract.email} email drift: got "${user?.email}"`
  );
  const userRole = await prisma.userRole.findUnique({ where: { user_id: contract.id } });
  assertContract(
    userRole?.role === expectedRole,
    `seeded user ${contract.email} role is not ${expectedRole} (got "${userRole?.role}")`
  );
}

async function verifyIdentities(): Promise<void> {
  await verifySeededIdentity(E2E_CONTRACT.demoPh, "PROGRAM_HEAD");
  await verifySeededIdentity(E2E_CONTRACT.beedPh, "PROGRAM_HEAD");
  await verifySeededIdentity(E2E_CONTRACT.demoFaculty, "FACULTY");
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
    where: {
      response_id: courseResponse.id,
      section_key: "qualitative",
      prompt_key: "qualitative-1",
    },
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

  const [bsit, beed] = await Promise.all([findProgramByCode("BSIT"), findProgramByCode("BEED")]);

  const [gestechBsba, gestechBsit, itres1Afternoon, mm201] = await Promise.all([
    findCourseAssignmentByDefinition(E2E_CONTRACT.rosterAssignments.gestechBsba),
    findCourseAssignmentByDefinition(E2E_CONTRACT.rosterAssignments.gestechBsit),
    findCourseAssignmentByDefinition(E2E_CONTRACT.rosterAssignments.itres1Afternoon),
    findCourseAssignmentByDefinition(E2E_CONTRACT.rosterAssignments.mm201),
  ]);

  // Roster-mutation preflight (issue #545): the mutation target must be owned
  // by the demo Faculty and unlocked; the unowned and locked assignments must
  // keep their expected states so the journey can prove ownership and lock.
  assertContract(
    gestechBsba.facultyId === E2E_CONTRACT.demoFaculty.id,
    `GESTECH BSBA MORNING must be owned by ${E2E_CONTRACT.demoFaculty.email} for the mutation journey`
  );
  assertContract(
    !gestechBsba.hasPublishedEvaluation,
    "GESTECH BSBA MORNING must have no published evaluation so the roster is mutable"
  );
  assertContract(
    itres1Afternoon.facultyId === E2E_CONTRACT.demoFaculty.id,
    `ITRES1 BSIT AFTERNOON must be owned by ${E2E_CONTRACT.demoFaculty.email}`
  );
  assertContract(
    gestechBsit.facultyId === E2E_CONTRACT.demoFaculty.id && gestechBsit.hasPublishedEvaluation,
    "GESTECH BSIT MORNING must be owned by the demo Faculty and published-locked"
  );
  assertContract(
    mm201.facultyId !== E2E_CONTRACT.demoFaculty.id,
    `MM201 BSBA MORNING must not be owned by ${E2E_CONTRACT.demoFaculty.email}`
  );

  // The mutation journeys assert deterministic outcomes against the seeded
  // roster. A previous e2e run against the same database leaves mutations
  // behind, so require the pristine seeded membership (re-seed the disposable
  // database before re-running the suite — CI seeds fresh per job).
  const seededMemberships = await prisma.courseAssignmentMembership.findMany({
    where: {
      course_assignment_id: gestechBsba.id,
      is_active: true,
    },
    select: { student_user_id: true },
  });
  const seededStudentIds = new Set(
    seededMemberships.map((membership) => membership.student_user_id)
  );
  const expectedSeedStudentIds = [
    E2E_CONTRACT.rosterStudents.alreadyActive.id,
    E2E_CONTRACT.rosterStudents.suggested.id,
  ];
  assertContract(
    seededStudentIds.size === expectedSeedStudentIds.length &&
      expectedSeedStudentIds.every((id) => seededStudentIds.has(id)),
    `GESTECH BSBA MORNING roster must start from the pristine seed (expected only ${expectedSeedStudentIds.join(", ")}). Re-seed the disposable database before re-running the e2e suite.`
  );

  const [courseResponse, bottomUpResponse] = await Promise.all([
    findSubmittedResponse(
      deployments.courseEvaluation.id,
      deployments.courseEvaluation.deployment_name
    ),
    findSubmittedResponse(
      deployments.bottomUpEvaluation.id,
      deployments.bottomUpEvaluation.deployment_name
    ),
  ]);

  await verifyResponseExpectations(courseResponse, bottomUpResponse);
  const ploId = await verifyPloEvidenceLink(bsit.id);

  const contract = E2E_CONTRACT;
  const fixture: FixtureData = {
    demoPh: { id: contract.demoPh.id, email: contract.demoPh.email },
    beedPh: { id: contract.beedPh.id, email: contract.beedPh.email },
    demoFaculty: { id: contract.demoFaculty.id, email: contract.demoFaculty.email },
    gestechBsba: {
      id: gestechBsba.id,
      courseCode: gestechBsba.courseCode,
      programCode: gestechBsba.programCode,
    },
    gestechBsit: {
      id: gestechBsit.id,
      courseCode: gestechBsit.courseCode,
      programCode: gestechBsit.programCode,
    },
    itres1Afternoon: {
      id: itres1Afternoon.id,
      courseCode: itres1Afternoon.courseCode,
      programCode: itres1Afternoon.programCode,
    },
    mm201: { id: mm201.id, courseCode: mm201.courseCode, programCode: mm201.programCode },
    rosterStudents: {
      addable: {
        id: contract.rosterStudents.addable.id,
        name: contract.rosterStudents.addable.name,
        email: contract.rosterStudents.addable.email,
      },
      alreadyActive: {
        id: contract.rosterStudents.alreadyActive.id,
        name: contract.rosterStudents.alreadyActive.name,
        email: contract.rosterStudents.alreadyActive.email,
      },
      csvAdd: {
        id: contract.rosterStudents.csvAdd.id,
        name: contract.rosterStudents.csvAdd.name,
        email: contract.rosterStudents.csvAdd.email,
      },
      suggested: {
        id: contract.rosterStudents.suggested.id,
        name: contract.rosterStudents.suggested.name,
        email: contract.rosterStudents.suggested.email,
      },
      outOfScope: {
        name: contract.rosterStudents.outOfScope.name,
        email: contract.rosterStudents.outOfScope.email,
      },
    },
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
