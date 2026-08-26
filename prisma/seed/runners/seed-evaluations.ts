import { DeploymentStatus, Prisma, YearLevel } from "@prisma/client";
import { prisma } from "../../../src/lib/db/prisma";
import { D, U } from "../constants/ids";
import {
  centralAssignDefs,
  centralDeploymentDefs,
  newCourseBoundDefs,
} from "../fixtures/evaluations";
import {
  ensureAssignment,
  listSeededRosterStudents,
  requireCourseAssignment,
} from "../helpers/assignments";
import type {
  CourseAssignmentContext,
  EvaluationContext,
  FoundationContext,
  OutcomeContext,
} from "../types";

export async function seedEvaluations(
  { pMap, cMap }: Pick<FoundationContext, "pMap" | "cMap">,
  ciloMap: OutcomeContext["ciloMap"],
  termInstanceId: string,
  { assignmentMap }: CourseAssignmentContext
): Promise<EvaluationContext> {
  const ciloVer = await prisma.instrumentVersion.findFirstOrThrow({
    where: { template: { code: "CILO_EVAL" }, version_number: 1 },
  });
  const exitVer = await prisma.instrumentVersion.findFirstOrThrow({
    where: { template: { code: "EXIT_SURVEY" }, version_number: 1 },
  });
  const alumVer = await prisma.instrumentVersion.findFirstOrThrow({
    where: { template: { code: "ALUMNI_EVAL" }, version_number: 1 },
  });
  const indVer = await prisma.instrumentVersion.findFirstOrThrow({
    where: { template: { code: "INDUSTRY_EVAL" }, version_number: 1 },
  });
  const y4 = YearLevel.FOURTH_YEAR;

  const bsit = pMap.get("BSIT")!;
  const bsba = pMap.get("BSBA")!;
  const bshm = pMap.get("BSHM")!;
  const bsed = pMap.get("BSED")!;
  const beed = pMap.get("BEED")!;

  // ── Course-Bound 1: BSIT ITRES1 ──────────────────────────────────
  console.log("  → Course-bound eval: ITRES1...");
  const itCourse = cMap.get("ITRES1")!;
  const itCilos = ciloMap.get("ITRES1") ?? [];
  const ciloSnap1: Prisma.InputJsonValue = itCilos.map((c) => ({
    description: c.description,
    order: c.order,
  }));
  const courseSnap1: Prisma.InputJsonValue = {
    courseCode: itCourse.code,
    courseTitle: itCourse.title,
    programCode: "BSIT",
    programName: "Bachelor of Science in Information Technology",
  };

  const cbEval1AssignmentId = requireCourseAssignment(
    assignmentMap,
    "ITRES1",
    "BSIT",
    YearLevel.FOURTH_YEAR,
    "MORNING"
  );

  const existingCbEval1 = await prisma.courseBoundEvaluation.findFirst({
    where: {
      course_assignment_id: cbEval1AssignmentId,
      term_instance_id: termInstanceId,
    },
  });

  const cbEval1Data = {
    deployment_name: "ITRES1 Post-Term CILO Evaluation",
    instrument_version_id: ciloVer.id,
    cilos_snapshot: ciloSnap1,
    course_info_snapshot: courseSnap1,
    activation_at: new Date("2026-04-01T08:00:00Z"),
    deadline_at: new Date("2026-05-31T23:59:00Z"),
    status: DeploymentStatus.ACTIVE,
    published_at: new Date("2026-04-01T08:00:00Z"),
    term_instance_id: termInstanceId,
    course_assignment_id: cbEval1AssignmentId,
  };

  const cbEval1 = existingCbEval1
    ? await prisma.courseBoundEvaluation.update({
        where: { id: existingCbEval1.id },
        data: cbEval1Data,
      })
    : await prisma.courseBoundEvaluation.create({
        data: { ...cbEval1Data, id: D.CB_BSIT_ITRES1 },
      });

  await prisma.courseBoundEvaluationTarget.upsert({
    where: {
      course_bound_evaluation_id_program_id_year_level: {
        course_bound_evaluation_id: cbEval1.id,
        program_id: bsit.id,
        year_level: y4,
      },
    },
    update: {},
    create: { course_bound_evaluation_id: cbEval1.id, program_id: bsit.id, year_level: y4 },
  });

  await prisma.courseBoundCiloQuestionBinding.createMany({
    data: itCilos.map((cilo) => ({
      cilo_description_snapshot: cilo.description,
      cilo_id: cilo.id,
      course_bound_evaluation_id: cbEval1.id,
      item_key: `cilo-attainment-${cilo.order}`,
      question_prompt_snapshot:
        cilo.order === 1
          ? "I achieved the first course intended learning outcome."
          : cilo.order === 2
            ? "I achieved the second course intended learning outcome."
            : "I achieved the third course intended learning outcome.",
      section_key: "cilo-items",
    })),
    skipDuplicates: true,
  });

  // Course-bound fixture recipients come from explicit Course-assignment memberships.
  for (const sid of await listSeededRosterStudents(cbEval1AssignmentId)) {
    await ensureAssignment({ courseBoundId: cbEval1.id, respondentId: sid });
  }

  // ── Course-Bound 2: BSBA MM201 ─────────────────────────────────────
  console.log("  → Course-bound eval: MM201...");
  const mktCourse = cMap.get("MM201")!;
  const mktCilos = ciloMap.get("MM201") ?? [];
  const ciloSnap2: Prisma.InputJsonValue = mktCilos.map((c) => ({
    description: c.description,
    order: c.order,
  }));
  const courseSnap2: Prisma.InputJsonValue = {
    courseCode: mktCourse.code,
    courseTitle: mktCourse.title,
    programCode: "BSBA",
    programName: "Bachelor of Science in Business Administration",
  };

  const cbEval2AssignmentId = requireCourseAssignment(
    assignmentMap,
    "MM201",
    "BSBA",
    YearLevel.FOURTH_YEAR,
    "MORNING"
  );

  const existingCbEval2 = await prisma.courseBoundEvaluation.findFirst({
    where: {
      course_assignment_id: cbEval2AssignmentId,
      term_instance_id: termInstanceId,
    },
  });

  const cbEval2Data = {
    deployment_name: "MM201 Post-Term CILO Evaluation",
    instrument_version_id: ciloVer.id,
    cilos_snapshot: ciloSnap2,
    course_info_snapshot: courseSnap2,
    activation_at: new Date("2026-04-01T08:00:00Z"),
    deadline_at: new Date("2026-05-31T23:59:00Z"),
    status: DeploymentStatus.ACTIVE,
    published_at: new Date("2026-04-01T08:00:00Z"),
    term_instance_id: termInstanceId,
    course_assignment_id: cbEval2AssignmentId,
  };

  const cbEval2 = existingCbEval2
    ? await prisma.courseBoundEvaluation.update({
        where: { id: existingCbEval2.id },
        data: cbEval2Data,
      })
    : await prisma.courseBoundEvaluation.create({
        data: { ...cbEval2Data, id: D.CB_BSBA_MM201 },
      });

  await prisma.courseBoundEvaluationTarget.upsert({
    where: {
      course_bound_evaluation_id_program_id_year_level: {
        course_bound_evaluation_id: cbEval2.id,
        program_id: bsba.id,
        year_level: y4,
      },
    },
    update: {},
    create: { course_bound_evaluation_id: cbEval2.id, program_id: bsba.id, year_level: y4 },
  });

  await prisma.courseBoundCiloQuestionBinding.createMany({
    data: mktCilos.map((cilo) => ({
      cilo_description_snapshot: cilo.description,
      cilo_id: cilo.id,
      course_bound_evaluation_id: cbEval2.id,
      item_key: `cilo-attainment-${cilo.order}`,
      question_prompt_snapshot:
        cilo.order === 1
          ? "I achieved the first course intended learning outcome."
          : "I achieved the second course intended learning outcome.",
      section_key: "cilo-items",
    })),
    skipDuplicates: true,
  });

  for (const sid of await listSeededRosterStudents(cbEval2AssignmentId)) {
    await ensureAssignment({ courseBoundId: cbEval2.id, respondentId: sid });
  }

  // ── Course-Bound 3–8: New program courses ────────────────────────────
  console.log("  → New course-bound evals...");

  const newCbEvals = new Map<string, { id: string }>();
  for (const def of newCourseBoundDefs) {
    const course = cMap.get(def.courseCode)!;
    const courseCilos = ciloMap.get(def.courseCode) ?? [];
    const ciloSnap: Prisma.InputJsonValue = courseCilos.map((c) => ({
      description: c.description,
      order: c.order,
    }));
    const courseSnap: Prisma.InputJsonValue = {
      courseCode: course.code,
      courseTitle: course.title,
      programCode: def.progCode,
      programName: def.progName,
    };

    const cbAssignmentId = requireCourseAssignment(
      assignmentMap,
      def.courseCode,
      def.progCode,
      def.ylId,
      def.section
    );

    const existingCb = await prisma.courseBoundEvaluation.findFirst({
      where: {
        course_assignment_id: cbAssignmentId,
        term_instance_id: termInstanceId,
      },
    });

    const now = Date.now();
    const cbData = {
      deployment_name: def.deployName,
      instrument_version_id: ciloVer.id,
      cilos_snapshot: ciloSnap,
      course_info_snapshot: courseSnap,
      activation_at:
        def.courseCode === "GESTECH"
          ? new Date(now - 7 * 24 * 60 * 60 * 1000)
          : new Date("2026-04-10T08:00:00Z"),
      deadline_at:
        def.courseCode === "GESTECH"
          ? new Date(now + 90 * 24 * 60 * 60 * 1000)
          : new Date("2026-05-31T23:59:00Z"),
      status: DeploymentStatus.ACTIVE,
      published_at:
        def.courseCode === "GESTECH"
          ? new Date(now - 7 * 24 * 60 * 60 * 1000)
          : new Date("2026-04-10T08:00:00Z"),
      term_instance_id: termInstanceId,
      course_assignment_id: cbAssignmentId,
    };

    const cb = existingCb
      ? await prisma.courseBoundEvaluation.update({ where: { id: existingCb.id }, data: cbData })
      : await prisma.courseBoundEvaluation.create({ data: { ...cbData, id: def.id } });

    newCbEvals.set(def.courseCode, cb);

    const programIdMap: Record<string, string> = {
      BSIT: bsit.id,
      BSBA: bsba.id,
      BSED: bsed.id,
      BSHM: bshm.id,
      BEED: beed.id,
    };
    const progId = programIdMap[def.progCode]!;

    await prisma.courseBoundEvaluationTarget.upsert({
      where: {
        course_bound_evaluation_id_program_id_year_level: {
          course_bound_evaluation_id: cb.id,
          program_id: progId,
          year_level: def.ylId,
        },
      },
      update: {},
      create: { course_bound_evaluation_id: cb.id, program_id: progId, year_level: def.ylId },
    });

    if (courseCilos.length > 0) {
      await prisma.courseBoundCiloQuestionBinding.createMany({
        data: courseCilos.map((cilo) => ({
          cilo_description_snapshot: cilo.description,
          cilo_id: cilo.id,
          course_bound_evaluation_id: cb.id,
          item_key: `cilo-attainment-${cilo.order}`,
          question_prompt_snapshot:
            cilo.order === 1
              ? "I achieved the first course intended learning outcome."
              : cilo.order === 2
                ? "I achieved the second course intended learning outcome."
                : "I achieved the third course intended learning outcome.",
          section_key: "cilo-items",
        })),
        skipDuplicates: true,
      });
    }

    for (const respondentId of await listSeededRosterStudents(cbAssignmentId)) {
      await ensureAssignment({ courseBoundId: cb.id, respondentId });
    }
  }

  // ── Central Deployments ──────────────────────────────────────────────
  console.log("  → Central deployments...");
  const versionByCode: Record<string, string> = {
    EXIT_SURVEY: exitVer.id,
    ALUMNI_EVAL: alumVer.id,
    INDUSTRY_EVAL: indVer.id,
  };
  const programIdByCode: Record<string, string> = {
    BSIT: bsit.id,
    BSHM: bshm.id,
  };

  for (const cd of centralDeploymentDefs) {
    const verId = versionByCode[cd.templateCode]!;
    const pid = programIdByCode[cd.progCode]!;
    const isRolling = "rollingWindow" in cd && cd.rollingWindow === true;
    const now = Date.now();
    const activationAt = isRolling
      ? new Date(now - 7 * 24 * 60 * 60 * 1000)
      : new Date("2026-04-15T08:00:00Z");
    const deadlineAt = isRolling
      ? new Date(now + 90 * 24 * 60 * 60 * 1000)
      : new Date("2026-06-01T23:59:00Z");
    await prisma.centralDeployment.upsert({
      where: { id: cd.id },
      update: {
        deployment_name: cd.name,
        instrument_version_id: verId,
        program_id: pid,
        major_id: null,
        target_stakeholder: cd.target,
        activation_at: activationAt,
        deadline_at: deadlineAt,
        status: DeploymentStatus.ACTIVE,
        year_level: cd.ylId,
        term_instance_id: termInstanceId,
      },
      create: {
        id: cd.id,
        deployment_name: cd.name,
        instrument_version_id: verId,
        program_id: pid,
        major_id: null,
        target_stakeholder: cd.target,
        activation_at: activationAt,
        deadline_at: deadlineAt,
        status: DeploymentStatus.ACTIVE,
        year_level: cd.ylId,
        term_instance_id: termInstanceId,
      },
    });
  }

  // Central deployment assignments
  const respondentIdByKey: Record<string, string> = {
    GRAD_BSIT: U.GRAD_BSIT,
    ALU_BSIT: U.ALU_BSIT,
    IND_BSIT: U.IND_BSIT,
    STU_BSHM_G: U.STU_BSHM_G,
    IND_BSHM: U.IND_BSHM,
  };

  for (const ca of centralAssignDefs) {
    const respId = respondentIdByKey[ca.respId]!;
    await ensureAssignment({ centralDeploymentId: ca.depId, respondentId: respId });
  }

  return { cbEval1, cbEval2, newCbEvals };
}
