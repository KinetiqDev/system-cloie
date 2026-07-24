import { prisma } from "../../../src/lib/db/prisma";
import { D } from "../constants/ids";
import { academicTermDefinitions, managedTermInstanceIds } from "../fixtures/academic-calendar";
import type { AcademicCalendarContext } from "../types";

export async function seedAcademicCalendar(): Promise<AcademicCalendarContext> {
  console.log("  → School years...");
  const sy2026_2027 = await prisma.schoolYear.upsert({
    where: { id: D.SY_2026_2027 },
    update: { code: "2026-2027", start_date: new Date("2026-06-01"), end_date: new Date("2027-05-31") },
    create: { id: D.SY_2026_2027, code: "2026-2027", start_date: new Date("2026-06-01"), end_date: new Date("2027-05-31") },
  });
  const sy2027_2028 = await prisma.schoolYear.upsert({
    where: { id: D.SY_2027_2028 },
    update: { code: "2027-2028", start_date: new Date("2027-06-01"), end_date: new Date("2028-05-31") },
    create: { id: D.SY_2027_2028, code: "2027-2028", start_date: new Date("2027-06-01"), end_date: new Date("2028-05-31") },
  });

  console.log("  → Resetting mock Academic Period fixtures...");
  await prisma.qualitativeResponseItem.deleteMany({ where: { response: { OR: [
    { assignment: { course_bound: { term_instance_id: { in: managedTermInstanceIds } } } },
    { assignment: { central_deployment: { term_instance_id: { in: managedTermInstanceIds } } } },
  ] } } });
  await prisma.quantitativeResponseItem.deleteMany({ where: { response: { OR: [
    { assignment: { course_bound: { term_instance_id: { in: managedTermInstanceIds } } } },
    { assignment: { central_deployment: { term_instance_id: { in: managedTermInstanceIds } } } },
  ] } } });
  await prisma.response.deleteMany({ where: { OR: [
    { assignment: { course_bound: { term_instance_id: { in: managedTermInstanceIds } } } },
    { assignment: { central_deployment: { term_instance_id: { in: managedTermInstanceIds } } } },
  ] } });
  await prisma.evaluationAssignment.deleteMany({ where: { OR: [
    { course_bound: { term_instance_id: { in: managedTermInstanceIds } } },
    { central_deployment: { term_instance_id: { in: managedTermInstanceIds } } },
  ] } });
  await prisma.courseBoundCiloQuestionBinding.deleteMany({ where: { course_bound_evaluation: { term_instance_id: { in: managedTermInstanceIds } } } });
  await prisma.courseBoundEvaluationTarget.deleteMany({ where: { course_bound_evaluation: { term_instance_id: { in: managedTermInstanceIds } } } });
  await prisma.courseBoundEvaluation.deleteMany({ where: { term_instance_id: { in: managedTermInstanceIds } } });
  await prisma.centralDeployment.deleteMany({ where: { term_instance_id: { in: managedTermInstanceIds } } });
  await prisma.courseAssignmentMembership.deleteMany({ where: { term_instance_id: { in: managedTermInstanceIds } } });
  await prisma.courseAssignment.deleteMany({ where: { term_instance_id: { in: managedTermInstanceIds } } });
  await prisma.studentEnrollment.deleteMany({ where: { term_instance_id: { in: managedTermInstanceIds } } });
  await prisma.$executeRawUnsafe('ALTER TABLE "academic_period_readiness_snapshots" DISABLE TRIGGER "academic_period_readiness_snapshots_immutable"');
  try {
    await prisma.academicPeriodReadinessSnapshot.deleteMany({ where: { period_id: { in: managedTermInstanceIds } } });
  } finally {
    await prisma.$executeRawUnsafe('ALTER TABLE "academic_period_readiness_snapshots" ENABLE TRIGGER "academic_period_readiness_snapshots_immutable"');
  }
  await prisma.academicTermInstance.deleteMany({ where: { id: { in: managedTermInstanceIds } } });

  console.log("  → Term instances (lifecycle fixtures)...");
  const schoolYears = { "2026-2027": sy2026_2027, "2027-2028": sy2027_2028 };
  const terms = {} as Record<string, Awaited<ReturnType<typeof prisma.academicTermInstance.create>>>;
  for (const definition of academicTermDefinitions) {
    terms[definition.id] = await prisma.academicTermInstance.create({
      data: {
        id: definition.id,
        school_year_id: schoolYears[definition.schoolYear].id,
        semester: definition.semester,
        term: definition.term,
        start_date: new Date(definition.startDate),
        end_date: new Date(definition.endDate),
        status: definition.status,
      },
    });
  }
  return {
    schoolYear: sy2026_2027,
    termInstance: terms[D.TI_2026_2027_2ND],
    termInstances: {
      ti2026First: terms[D.TI_2026_2027_1ST],
      ti2026Second: terms[D.TI_2026_2027_2ND],
      ti2027First: terms[D.TI_2027_2028_1ST],
      ti2027SecondCancelled: terms[D.TI_2027_2028_2ND_CANCELLED],
    },
  };
}
