import { beforeEach, describe, expect, it, vi } from "vitest";
import { AcademicSemester, AcademicTerm } from "@prisma/client";

const {
  backfillCanonicalTermInstancesMock,
  createSchoolYearWithCanonicalTermsMock,
  prisma,
} = vi.hoisted(() => ({
  backfillCanonicalTermInstancesMock: vi.fn(),
  createSchoolYearWithCanonicalTermsMock: vi.fn(),
  prisma: {
    schoolYear: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    qualitativeResponseItem: { deleteMany: vi.fn() },
    quantitativeResponseItem: { deleteMany: vi.fn() },
    response: { deleteMany: vi.fn() },
    evaluationAssignment: { deleteMany: vi.fn() },
    courseBoundCiloQuestionBinding: { deleteMany: vi.fn() },
    courseBoundEvaluationTarget: { deleteMany: vi.fn() },
    courseBoundEvaluation: { deleteMany: vi.fn() },
    centralDeployment: { deleteMany: vi.fn() },
    courseAssignmentMembership: { deleteMany: vi.fn() },
    courseAssignment: { deleteMany: vi.fn() },
    studentEnrollment: { deleteMany: vi.fn() },
    $executeRawUnsafe: vi.fn(),
    academicPeriodReadinessSnapshot: { deleteMany: vi.fn() },
    academicTermInstance: { findFirst: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma }));
vi.mock("@/features/academic-calendar/services/manage-school-years", () => ({
  backfillCanonicalTermInstances: backfillCanonicalTermInstancesMock,
  createSchoolYearWithCanonicalTerms: createSchoolYearWithCanonicalTermsMock,
}));

import { D } from "@/../prisma/seed/constants/ids";
import { academicTermDefinitions } from "@/../prisma/seed/fixtures/academic-calendar";
import { seedAcademicCalendar } from "@/../prisma/seed/runners/seed-academic-calendar";

const schoolYearIdFor = (code: string) =>
  code === "2026-2027" ? D.SY_2026_2027 : D.SY_2027_2028;

describe("seed-academic-calendar runner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    backfillCanonicalTermInstancesMock.mockResolvedValue([]);
    // Fresh database: no School Year rows exist yet, so the canonical creation
    // path is used for both fixture years.
    prisma.schoolYear.findUnique.mockResolvedValue(null);
    createSchoolYearWithCanonicalTermsMock.mockImplementation(async ({ id, startYear }) => ({
      id,
      code: `${startYear}-${startYear + 1}`,
    }));
    prisma.schoolYear.update.mockImplementation(async ({ where }) => ({ id: where.id }));
    prisma.schoolYear.updateMany.mockResolvedValue({ count: 0 });
    prisma.academicTermInstance.findFirst.mockImplementation(async ({ where }) => {
      const definition = academicTermDefinitions.find(
        (d) =>
          schoolYearIdFor(d.schoolYear) === where.school_year_id &&
          d.semester === where.semester &&
          (d.term ?? null) === (where.term ?? null)
      );
      return definition ? { id: definition.id } : null;
    });
    prisma.academicTermInstance.update.mockImplementation(
      async ({ where }: { where: { id: string } }) => ({ id: where.id })
    );
  });

  it("creates School Years through the canonical path, backfills, applies lifecycle statuses, and activates SY_2026_2027", async () => {
    const context = await seedAcademicCalendar();

    expect(prisma.schoolYear.findUnique).toHaveBeenCalledTimes(2);
    expect(createSchoolYearWithCanonicalTermsMock).toHaveBeenCalledTimes(2);
    expect(createSchoolYearWithCanonicalTermsMock).toHaveBeenCalledWith({
      id: D.SY_2026_2027,
      startYear: 2026,
      startDate: new Date("2026-06-01"),
      endDate: new Date("2027-05-31"),
    });
    expect(backfillCanonicalTermInstancesMock).toHaveBeenCalledTimes(1);
    expect(prisma.academicTermInstance.update).toHaveBeenCalledTimes(
      academicTermDefinitions.length
    );

    // One active School Year: clear any previous active year, then activate
    // the fixture year with FIRST.
    expect(prisma.schoolYear.updateMany).toHaveBeenCalledWith({
      where: { is_active: true },
      data: {
        is_active: false,
        active_semester: null,
        active_semester_activated_by: null,
        active_semester_activated_at: null,
      },
    });
    expect(prisma.schoolYear.update).toHaveBeenCalledWith({
      where: { id: D.SY_2026_2027 },
      data: {
        is_active: true,
        active_semester: AcademicSemester.FIRST,
        active_semester_activated_at: expect.any(Date),
      },
    });

    for (const definition of academicTermDefinitions) {
      expect(prisma.academicTermInstance.update).toHaveBeenCalledWith({
        where: { id: definition.id },
        data: {
          start_date: new Date(definition.startDate),
          end_date: new Date(definition.endDate),
          status: definition.status,
        },
      });
    }

    expect(context.termInstance.id).toBe(D.TI_2026_2027_2ND);
  });

  it("reconciles an existing fixture School Year by update instead of re-creating it", async () => {
    prisma.schoolYear.findUnique.mockResolvedValue({ id: D.SY_2026_2027 });

    await seedAcademicCalendar();

    expect(createSchoolYearWithCanonicalTermsMock).not.toHaveBeenCalled();
    expect(prisma.schoolYear.update).toHaveBeenCalledWith({
      where: { id: D.SY_2026_2027 },
      data: {
        code: "2026-2027",
        start_date: new Date("2026-06-01"),
        end_date: new Date("2027-05-31"),
      },
    });
  });

  it("resolves fixture rows by canonical pair after creation", async () => {
    prisma.academicTermInstance.findFirst.mockResolvedValue({ id: "generated-id" } as never);

    const context = await seedAcademicCalendar();

    for (const definition of academicTermDefinitions) {
      expect(prisma.academicTermInstance.update).toHaveBeenCalledWith({
        where: { id: "generated-id" },
        data: {
          start_date: new Date(definition.startDate),
          end_date: new Date(definition.endDate),
          status: definition.status,
        },
      });
    }
    expect(context.termInstance.id).toBe("generated-id");
    expect(context.termInstances.ti2026First.id).toBe("generated-id");
    expect(prisma.studentEnrollment.deleteMany).toHaveBeenCalledWith({
      where: { term_instance_id: { in: ["generated-id", "generated-id", "generated-id", "generated-id"] } },
    });
  });

  it("fails loudly when a fixture pair cannot be resolved after canonical creation", async () => {
    prisma.academicTermInstance.findFirst.mockResolvedValue(null);

    await expect(seedAcademicCalendar()).rejects.toThrow(/missing after canonical creation/i);
  });

  it("returns the expected lifecycle fixture term ids", async () => {
    const context = await seedAcademicCalendar();

    expect(context.termInstances.ti2026First.id).toBe(D.TI_2026_2027_1ST);
    expect(context.termInstances.ti2026Second.id).toBe(D.TI_2026_2027_2ND);
    expect(context.termInstances.ti2027First.id).toBe(D.TI_2027_2028_1ST);
    expect(context.termInstances.ti2027SecondCancelled.id).toBe(
      D.TI_2027_2028_2ND_CANCELLED
    );
  });

  it("uses a canonical fixture set (all fixture pairs are structural terms)", () => {
    const canonical = new Set(
      [
        [AcademicSemester.FIRST, AcademicTerm.FIRST_TERM],
        [AcademicSemester.FIRST, AcademicTerm.SECOND_TERM],
        [AcademicSemester.SECOND, AcademicTerm.FIRST_TERM],
        [AcademicSemester.SECOND, AcademicTerm.SECOND_TERM],
        [AcademicSemester.SUMMER, null],
      ].map(([semester, term]) => `${semester}:${term ?? ""}`)
    );

    expect(academicTermDefinitions).toHaveLength(4);
    for (const definition of academicTermDefinitions) {
      expect(canonical.has(`${definition.semester}:${definition.term ?? ""}`)).toBe(true);
    }
  });
});
