import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma, AcademicPeriodStatus, AcademicSemester, AcademicTerm } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";
import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";
import { CANONICAL_TERMS } from "@/lib/constants/academic-period";

const { invalidateAcademicPeriodReadModelTagsMock } = vi.hoisted(() => ({
  invalidateAcademicPeriodReadModelTagsMock: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: vi.fn(),
}));
vi.mock("@/lib/cache/academic-periods", () => ({
  invalidateAcademicPeriodReadModelTags: invalidateAcademicPeriodReadModelTagsMock,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    schoolYear: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    academicTermInstance: {
      findFirst: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

import * as authModule from "@/features/auth/services/resolve-auth-session";
import { prisma } from "@/lib/db/prisma";
import {
  backfillCanonicalTermInstances,
  createSchoolYear,
} from "@/features/academic-calendar/services/manage-school-years";

const secretary = createAuthSessionSnapshot({
  userId: "secretary-1",
  email: "secretary@test.com",
  roles: [ROLES.SECRETARY],
});

describe("manage-school-years / canonical term creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary);
    vi.mocked(prisma.$transaction).mockImplementation((callback) =>
      callback(prisma as never)
    );
  });

  it("creates the School Year and all 5 canonical terms in one Serializable transaction", async () => {
    vi.mocked(prisma.schoolYear.create).mockResolvedValue({
      id: "sy-1",
      code: "2026-2027",
    } as never);
    vi.mocked(prisma.academicTermInstance.create).mockResolvedValue({ id: "ti" } as never);

    const result = await createSchoolYear({ startYear: 2026 });

    expect(result).toEqual({ success: true, data: { id: "sy-1", code: "2026-2027" } });
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
    expect(prisma.academicTermInstance.create).toHaveBeenCalledTimes(5);
    for (const canonical of CANONICAL_TERMS) {
      expect(prisma.academicTermInstance.create).toHaveBeenCalledWith({
        data: {
          school_year_id: "sy-1",
          semester: canonical.semester,
          term: canonical.term,
          status: AcademicPeriodStatus.PLANNED,
        },
      });
    }
    expect(invalidateAcademicPeriodReadModelTagsMock).toHaveBeenCalledWith();
  });

  it("rolls back the entire transaction when a canonical term creation fails", async () => {
    vi.mocked(prisma.schoolYear.create).mockResolvedValue({
      id: "sy-1",
      code: "2026-2027",
    } as never);
    vi.mocked(prisma.academicTermInstance.create).mockRejectedValueOnce(
      new Error("boom")
    );

    await expect(createSchoolYear({ startYear: 2026 })).rejects.toThrow("boom");
    expect(invalidateAcademicPeriodReadModelTagsMock).not.toHaveBeenCalled();
  });

  it("maps a duplicate school year code to a friendly error", async () => {
    vi.mocked(prisma.schoolYear.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "6" })
    );

    const result = await createSchoolYear({ startYear: 2026 });

    expect(result).toEqual({
      success: false,
      error: 'A school year with code "2026-2027" already exists',
    });
  });
});

describe("manage-school-years / canonical term backfill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates only the missing canonical terms for each school year", async () => {
    vi.mocked(prisma.schoolYear.findMany).mockResolvedValue([
      {
        id: "sy-1",
        term_instances: [
          { semester: AcademicSemester.FIRST, term: AcademicTerm.FIRST_TERM },
          { semester: AcademicSemester.SUMMER, term: null },
        ],
      },
      {
        id: "sy-2",
        term_instances: [],
      },
    ] as never);
    vi.mocked(prisma.academicTermInstance.createMany).mockResolvedValue({ count: 8 } as never);

    const result = await backfillCanonicalTermInstances();

    expect(result).toEqual([
      { schoolYearId: "sy-1", created: 3 },
      { schoolYearId: "sy-2", created: 5 },
    ]);
    expect(prisma.academicTermInstance.createMany).toHaveBeenCalledTimes(2);
    expect(prisma.academicTermInstance.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        { school_year_id: "sy-2", semester: AcademicSemester.SUMMER, term: null, status: AcademicPeriodStatus.PLANNED },
      ]),
      skipDuplicates: true,
    });
  });

  it("is idempotent: a fully canonical school year creates nothing on repeat runs", async () => {
    vi.mocked(prisma.schoolYear.findMany).mockResolvedValue([
      {
        id: "sy-1",
        term_instances: CANONICAL_TERMS.map((c) => ({ semester: c.semester, term: c.term })),
      },
    ] as never);

    const result = await backfillCanonicalTermInstances();

    expect(result).toEqual([]);
    expect(prisma.academicTermInstance.createMany).not.toHaveBeenCalled();
  });

  it("skips school years that already have all canonical terms", async () => {
    vi.mocked(prisma.schoolYear.findMany).mockResolvedValue([
      {
        id: "sy-1",
        term_instances: [
          { semester: AcademicSemester.FIRST, term: AcademicTerm.FIRST_TERM },
          { semester: AcademicSemester.FIRST, term: AcademicTerm.SECOND_TERM },
          { semester: AcademicSemester.SECOND, term: AcademicTerm.FIRST_TERM },
          { semester: AcademicSemester.SECOND, term: AcademicTerm.SECOND_TERM },
          { semester: AcademicSemester.SUMMER, term: null },
        ],
      },
    ] as never);

    const result = await backfillCanonicalTermInstances();

    expect(result).toEqual([]);
    expect(prisma.academicTermInstance.createMany).not.toHaveBeenCalled();
  });
});
