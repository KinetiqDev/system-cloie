import { prisma } from "../../../src/lib/db/prisma";
import { backfillCanonicalTermInstances } from "../../../src/features/academic-calendar/services/manage-school-years";
import { D } from "../constants/ids";
import { academicTermDefinitions } from "../fixtures/academic-calendar";
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
  const schoolYearIds: Record<string, string> = {
    "2026-2027": sy2026_2027.id,
    "2027-2028": sy2027_2028.id,
  };

  console.log("  → Creating canonical lifecycle fixtures (fixed ids where free)...");
  await prisma.academicTermInstance.createMany({
    data: academicTermDefinitions.map((definition) => ({
      id: definition.id,
      school_year_id: schoolYearIds[definition.schoolYear],
      semester: definition.semester,
      term: definition.term,
      start_date: new Date(definition.startDate),
      end_date: new Date(definition.endDate),
      status: definition.status,
    })),
    skipDuplicates: true,
  });

  console.log("  → Ensuring remaining canonical term instances per school year...");
  await backfillCanonicalTermInstances();

  // Resolve each fixture row by its canonical pair AFTER creation/backfill.
  // The fixed id may already be owned by an unrelated row (createMany skips on
  // the PK conflict) or the pair may live under a generated id; the pair lookup
  // always lands on the real fixture row.
  const fixtureTermIds: Record<string, string> = {};
  for (const definition of academicTermDefinitions) {
    const existing = await prisma.academicTermInstance.findFirst({
      where: {
        school_year_id: schoolYearIds[definition.schoolYear],
        semester: definition.semester,
        term: definition.term,
      },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(
        `Fixture term pair ${definition.semester}/${definition.term ?? "null"} ` +
          `for school year ${definition.schoolYear} is missing after canonical creation`
      );
    }
    fixtureTermIds[definition.id] = existing.id;
  }
  const fixtureTermIdList = academicTermDefinitions.map((d) => fixtureTermIds[d.id]);

  console.log("  → Resetting mock Academic Period fixtures...");
  await prisma.qualitativeResponseItem.deleteMany({ where: { response: { OR: [
    { assignment: { course_bound: { term_instance_id: { in: fixtureTermIdList } } } },
    { assignment: { central_deployment: { term_instance_id: { in: fixtureTermIdList } } } },
  ] } } });
  await prisma.quantitativeResponseItem.deleteMany({ where: { response: { OR: [
    { assignment: { course_bound: { term_instance_id: { in: fixtureTermIdList } } } },
    { assignment: { central_deployment: { term_instance_id: { in: fixtureTermIdList } } } },
  ] } } });
  await prisma.response.deleteMany({ where: { OR: [
    { assignment: { course_bound: { term_instance_id: { in: fixtureTermIdList } } } },
    { assignment: { central_deployment: { term_instance_id: { in: fixtureTermIdList } } } },
  ] } });
  await prisma.evaluationAssignment.deleteMany({ where: { OR: [
    { course_bound: { term_instance_id: { in: fixtureTermIdList } } },
    { central_deployment: { term_instance_id: { in: fixtureTermIdList } } },
  ] } });
  await prisma.courseBoundCiloQuestionBinding.deleteMany({ where: { course_bound_evaluation: { term_instance_id: { in: fixtureTermIdList } } } });
  await prisma.courseBoundEvaluationTarget.deleteMany({ where: { course_bound_evaluation: { term_instance_id: { in: fixtureTermIdList } } } });
  await prisma.courseBoundEvaluation.deleteMany({ where: { term_instance_id: { in: fixtureTermIdList } } });
  await prisma.centralDeployment.deleteMany({ where: { term_instance_id: { in: fixtureTermIdList } } });
  await prisma.courseAssignmentMembership.deleteMany({ where: { term_instance_id: { in: fixtureTermIdList } } });
  await prisma.courseAssignment.deleteMany({ where: { term_instance_id: { in: fixtureTermIdList } } });
  await prisma.studentEnrollment.deleteMany({ where: { term_instance_id: { in: fixtureTermIdList } } });
  await prisma.$executeRawUnsafe('ALTER TABLE "academic_period_readiness_snapshots" DISABLE TRIGGER "academic_period_readiness_snapshots_immutable"');
  try {
    await prisma.academicPeriodReadinessSnapshot.deleteMany({ where: { period_id: { in: fixtureTermIdList } } });
  } finally {
    await prisma.$executeRawUnsafe('ALTER TABLE "academic_period_readiness_snapshots" ENABLE TRIGGER "academic_period_readiness_snapshots_immutable"');
  }

  console.log("  → Applying lifecycle fixture statuses...");
  const terms = {} as Record<string, Awaited<ReturnType<typeof prisma.academicTermInstance.update>>>;
  for (const definition of academicTermDefinitions) {
    terms[definition.id] = await prisma.academicTermInstance.update({
      where: { id: fixtureTermIds[definition.id] },
      data: {
        start_date: new Date(definition.startDate),
        end_date: new Date(definition.endDate),
        status: definition.status,
      },
    });
  }
  return {
    termInstance: terms[D.TI_2026_2027_2ND],
    termInstances: {
      ti2026First: terms[D.TI_2026_2027_1ST],
      ti2026Second: terms[D.TI_2026_2027_2ND],
      ti2027First: terms[D.TI_2027_2028_1ST],
      ti2027SecondCancelled: terms[D.TI_2027_2028_2ND_CANCELLED],
    },
  };
}
