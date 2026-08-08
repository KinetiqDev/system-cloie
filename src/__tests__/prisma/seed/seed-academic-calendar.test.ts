import { beforeEach, describe, expect, it, vi } from "vitest";
import { AcademicPeriodStatus, AcademicSemester, AcademicTerm } from "@prisma/client";

const { backfillCanonicalTermInstancesMock, prisma } = vi.hoisted(() => ({
  backfillCanonicalTermInstancesMock: vi.fn(),
  prisma: {
    schoolYear: { upsert: vi.fn() },
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
    academicTermInstance: { createMany: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma }));
vi.mock("@/features/academic-calendar/services/manage-school-years", () => ({
  backfillCanonicalTermInstances: backfillCanonicalTermInstancesMock,
}));

import { D } from "@/../prisma/seed/constants/ids";
import { academicTermDefinitions } from "@/../prisma/seed/fixtures/academic-calendar";
import { seedAcademicCalendar } from "@/../prisma/seed/runners/seed-academic-calendar";

describe("seed-academic-calendar runner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    backfillCanonicalTermInstancesMock.mockResolvedValue([]);
    prisma.schoolYear.upsert.mockResolvedValue({ id: "sy" });
    prisma.academicTermInstance.createMany.mockResolvedValue({ count: 4 });
    prisma.academicTermInstance.update.mockImplementation(
      async ({ where }: { where: { id: string } }) => ({ id: where.id })
    );
  });

  it("creates fixture terms with stable ids, then backfills, then applies lifecycle statuses", async () => {
    const context = await seedAcademicCalendar();

    expect(prisma.schoolYear.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.academicTermInstance.createMany).toHaveBeenCalledWith({
      data: academicTermDefinitions.map((definition) => ({
        id: definition.id,
        school_year_id: "sy",
        semester: definition.semester,
        term: definition.term,
        start_date: new Date(definition.startDate),
        end_date: new Date(definition.endDate),
        status: definition.status,
      })),
      skipDuplicates: true,
    });
    expect(backfillCanonicalTermInstancesMock).toHaveBeenCalledTimes(1);
    expect(prisma.academicTermInstance.update).toHaveBeenCalledTimes(
      academicTermDefinitions.length
    );

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

  it("creates fixture rows before backfill so updates by fixed id never miss on a fresh database", async () => {
    await seedAcademicCalendar();

    const createManyOrder = prisma.academicTermInstance.createMany.mock.invocationCallOrder[0];
    const backfillOrder = backfillCanonicalTermInstancesMock.mock.invocationCallOrder[0];
    const updateOrder = prisma.academicTermInstance.update.mock.invocationCallOrder[0];

    expect(createManyOrder).toBeDefined();
    expect(backfillOrder).toBeDefined();
    expect(updateOrder).toBeDefined();
    expect(createManyOrder).toBeLessThan(backfillOrder);
    expect(backfillOrder).toBeLessThan(updateOrder);
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
