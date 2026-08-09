import { prisma } from "../../../src/lib/db/prisma";
import {
  backfillCanonicalTermInstances,
  createSchoolYearWithCanonicalTerms,
} from "../../../src/features/academic-calendar/services/manage-school-years";
import { AcademicSemester } from "@prisma/client";
import { D } from "../constants/ids";
import { academicTermDefinitions } from "../fixtures/academic-calendar";
import type { AcademicCalendarContext } from "../types";

export async function seedAcademicCalendar(): Promise<AcademicCalendarContext> {
  console.log("  → School years...");
  const schoolYearDefinitions = [
    {
      id: D.SY_2026_2027,
      startYear: 2026,
      startDate: new Date("2026-06-01"),
      endDate: new Date("2027-05-31"),
    },
    {
      id: D.SY_2027_2028,
      startYear: 2027,
      startDate: new Date("2027-06-01"),
      endDate: new Date("2028-05-31"),
    },
  ];

  // Create School Years through the canonical path (School Year + its 5
  // canonical AcademicTermInstance rows in one transaction); on re-seed the
  // fixed fixture ids already exist, so reconcile by updating instead.
  const schoolYearIds: Record<string, string> = {};
  for (const definition of schoolYearDefinitions) {
    const existing = await prisma.schoolYear.findUnique({
      where: { id: definition.id },
      select: { id: true },
    });

    if (existing) {
      await prisma.schoolYear.update({
        where: { id: definition.id },
        data: {
          code: `${definition.startYear}-${definition.startYear + 1}`,
          start_date: definition.startDate,
          end_date: definition.endDate,
        },
      });
      schoolYearIds[`${definition.startYear}-${definition.startYear + 1}`] = definition.id;
    } else {
      const created = await createSchoolYearWithCanonicalTerms({
        id: definition.id,
        startYear: definition.startYear,
        startDate: definition.startDate,
        endDate: definition.endDate,
      });
      schoolYearIds[created.code] = created.id;
    }
  }

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

  console.log("  → Activating SY_2026_2027 with FIRST as the active semester...");
  // The one-active-school-year partial unique index allows at most one active
  // School Year, so clear any previously active year before activating the
  // fixture year.
  await prisma.schoolYear.updateMany({
    where: { is_active: true },
    data: {
      is_active: false,
      active_semester: null,
      active_semester_activated_by: null,
      active_semester_activated_at: null,
    },
  });
  await prisma.schoolYear.update({
    where: { id: D.SY_2026_2027 },
    data: {
      is_active: true,
      active_semester: AcademicSemester.FIRST,
      active_semester_activated_at: new Date(),
    },
  });

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
