import { loadEnvConfig } from "@next/env";
import {
  AcademicSemester,
  AcademicTerm,
  DeploymentStatus,
  StudentSection,
  YearLevel,
} from "@prisma/client";
import { pathToFileURL } from "node:url";

import { prisma } from "../src/lib/db/prisma";
import { ROLES, type Role } from "../src/lib/constants/roles";

loadEnvConfig(process.cwd());

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function startOfNextWeek() {
  const value = new Date();

  value.setDate(value.getDate() + 7);

  return value;
}

type DemoUserInput = {
  email: string;
  name: string;
};

type ExistingDemoUser = {
  email: string;
  name: string;
};

export function assertSafeDemoUserReuse(existingUser: ExistingDemoUser, input: DemoUserInput) {
  if (existingUser.name !== input.name) {
    throw new Error(
      `Refusing to reuse existing user ${input.email} because it does not match the outline defense demo marker.`
    );
  }
}

async function ensureUser(input: DemoUserInput) {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!existingUser) {
    return prisma.user.create({
      data: {
        email: input.email,
        is_active: true,
        name: input.name,
      },
    });
  }

  assertSafeDemoUserReuse(existingUser, input);

  return prisma.user.update({
    where: { id: existingUser.id },
    data: { is_active: true },
  });
}

async function ensureUserRole(userId: string, role: Role) {
  await prisma.userRole.upsert({
    where: {
      user_id: userId,
    },
    update: {
      role,
    },
    create: {
      user_id: userId,
      role,
    },
  });
}

async function main() {
  const facultyEmail = requireEnv("OUTLINE_FACULTY_EMAIL");
  const programHeadEmail = requireEnv("OUTLINE_PROGRAM_HEAD_EMAIL");
  const deanEmail = requireEnv("OUTLINE_DEAN_EMAIL");
  const studentEmail = requireEnv("OUTLINE_STUDENT_EMAIL");
  const semester = AcademicSemester.SECOND;
  const term = AcademicTerm.SECOND_TERM;

  const yearLevel = YearLevel.FOURTH_YEAR;
  const yearLevelName = "4th Year";

  const [program, course, instrumentVersion] = await Promise.all([
    prisma.program.findUnique({ where: { code: "BSIT" } }),
    prisma.course.findUnique({ where: { code: "IT-OD-401" } }),
    prisma.instrumentVersion.findFirst({
      where: {
        is_active: true,
        template: { code: "CILO_EVAL" },
        version_number: 1,
      },
      include: {
        template: true,
      },
    }),
  ]);

  if (!program || !course || !instrumentVersion) {
    throw new Error(
      "Seed prerequisites are missing. Run `pnpm db:seed` before bootstrapping the outline defense demo."
    );
  }

  const faculty = await ensureUser({
    email: facultyEmail,
    name: "Outline Demo Faculty",
  });
  const programHead = await ensureUser({
    email: programHeadEmail,
    name: "Outline Demo Program Head",
  });
  const dean = await ensureUser({
    email: deanEmail,
    name: "Outline Demo Dean",
  });
  const student = await ensureUser({
    email: studentEmail,
    name: "Outline Demo Student",
  });

  await Promise.all([
    ensureUserRole(faculty.id, ROLES.FACULTY),
    ensureUserRole(programHead.id, ROLES.PROGRAM_HEAD),
    ensureUserRole(dean.id, ROLES.DEAN),
    ensureUserRole(student.id, ROLES.STUDENT),
  ]);

  await prisma.facultyProgramAffiliation.upsert({
    where: {
      faculty_id_program_id: {
        faculty_id: faculty.id,
        program_id: program.id,
      },
    },
    update: {
      is_active: true,
    },
    create: {
      faculty_id: faculty.id,
      program_id: program.id,
      is_active: true,
    },
  });

  await prisma.programHeadAssignment.upsert({
    where: {
      program_head_id_program_id: {
        program_head_id: programHead.id,
        program_id: program.id,
      },
    },
    update: {
      is_active: true,
    },
    create: {
      program_head_id: programHead.id,
      program_id: program.id,
      is_active: true,
    },
  });

  await prisma.studentAcademicProfile.upsert({
    where: { user_id: student.id },
    update: {
      program_id: program.id,
      student_id_number: "OUTLINE-DEMO-001",
    },
    create: {
      program_id: program.id,
      student_id_number: "OUTLINE-DEMO-001",
      user_id: student.id,
    },
  });

  const termInstance = await prisma.academicTermInstance.findFirst({
    where: { semester, term },
    orderBy: { created_at: "desc" },
  });

  if (!termInstance) {
    throw new Error(
      "No matching AcademicTermInstance found for the demo's semester/term. Ensure seed data is loaded."
    );
  }

  const section = StudentSection.MORNING;

  let courseAssignment = await prisma.courseAssignment.findFirst({
    where: {
      term_instance_id: termInstance.id,
      course_id: course.id,
      faculty_id: faculty.id,
      program_id: program.id,
      year_level: yearLevel,
      section,
    },
  });

  if (!courseAssignment) {
    courseAssignment = await prisma.courseAssignment.create({
      data: {
        term_instance_id: termInstance.id,
        course_id: course.id,
        faculty_id: faculty.id,
        program_id: program.id,
        year_level: yearLevel,
        section,
      },
    });
  }

  let evaluation = await prisma.courseBoundEvaluation.findFirst({
    where: {
      term_instance_id: termInstance.id,
      course_assignment_id: courseAssignment.id,
      instrument_version_id: instrumentVersion.id,
    },
  });

  if (!evaluation) {
    evaluation = await prisma.courseBoundEvaluation.create({
      data: {
        term_instance_id: termInstance.id,
        activation_at: new Date(),
        cilos_snapshot: [],
        course_info_snapshot: {
          code: course.code,
          programCode: program.code,
          title: course.title,
        },
        deadline_at: startOfNextWeek(),
        deployment_name: "Outline Defense Demo CILO Evaluation",
        instrument_version_id: instrumentVersion.id,
        course_assignment_id: courseAssignment.id,
        published_at: new Date(),
        status: DeploymentStatus.ACTIVE,
      },
    });
  }

  await prisma.courseBoundEvaluationTarget.upsert({
    where: {
      course_bound_evaluation_id_program_id_year_level: {
        course_bound_evaluation_id: evaluation.id,
        program_id: program.id,
        year_level: yearLevel,
      },
    },
    update: {},
    create: {
      course_bound_evaluation_id: evaluation.id,
      program_id: program.id,
      year_level: yearLevel,
    },
  });

  const existingAssignment = await prisma.evaluationAssignment.findFirst({
    where: {
      course_bound_id: evaluation.id,
      respondent_id: student.id,
    },
  });

  if (!existingAssignment) {
    await prisma.evaluationAssignment.create({
      data: {
        course_bound_id: evaluation.id,
        respondent_id: student.id,
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        course: course.code,
        dean: dean.email,
        evaluationId: evaluation.id,
        faculty: faculty.email,
        program: program.code,
        programHead: programHead.email,
        yearLevel: yearLevelName,
        student: student.email,
      },
      null,
      2
    )
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
