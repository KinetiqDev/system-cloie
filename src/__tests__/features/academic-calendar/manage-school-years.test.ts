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
      updateMany: vi.fn(),
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
  activateSchoolYear,
  deactivateSchoolYear,
  setActiveSemester,
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

describe("manage-school-years / activateSchoolYear", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary);
    vi.mocked(prisma.academicTermInstance.findFirst).mockReset();
    vi.mocked(prisma.$transaction).mockImplementation((callback) =>
      callback(prisma as never)
    );
  });

  it("denies non-secretary access", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({
        userId: "faculty-1",
        email: "faculty@test.com",
        roles: [ROLES.FACULTY],
      })
    );

    const result = await activateSchoolYear("sy-1");

    expect(result).toEqual({ success: false, error: "Secretary access required" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("denies access when Secretary is not the active role", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ roles: [ROLES.FACULTY, ROLES.SECRETARY] })
    );

    const result = await activateSchoolYear("sy-1");

    expect(result).toEqual({ success: false, error: "Secretary access required" });
  });

  it("returns an error when the school year is not found", async () => {
    vi.mocked(prisma.schoolYear.findUnique).mockResolvedValue(null);

    const result = await activateSchoolYear("sy-missing");

    expect(result).toEqual({ success: false, error: "School year not found" });
  });

  it("rejects activation when active_semester is null and none supplied", async () => {
    vi.mocked(prisma.schoolYear.findUnique).mockResolvedValue({
      id: "sy-1",
      is_active: false,
      is_archived: false,
      active_semester: null,
    } as never);

    const result = await activateSchoolYear("sy-1");

    expect(result).toEqual({
      success: false,
      error: "Set an active semester before activating the school year",
    });
    expect(prisma.schoolYear.update).not.toHaveBeenCalled();
  });

  it("persists a caller-supplied semester and audit fields during activation", async () => {
    vi.mocked(prisma.schoolYear.findUnique).mockResolvedValue({
      id: "sy-1",
      is_active: false,
      is_archived: false,
      active_semester: null,
    } as never);
    vi.mocked(prisma.schoolYear.updateMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.schoolYear.update).mockResolvedValue({ id: "sy-1" } as never);

    const result = await activateSchoolYear("sy-1", AcademicSemester.FIRST);

    expect(result).toEqual({ success: true, data: { id: "sy-1" } });
    expect(prisma.schoolYear.update).toHaveBeenCalledWith({
      where: { id: "sy-1" },
      data: {
        is_active: true,
        active_semester: AcademicSemester.FIRST,
        active_semester_activated_by: "secretary-1",
        active_semester_activated_at: expect.any(Date),
      },
    });
  });

  it("rejects activation of an already active school year", async () => {
    vi.mocked(prisma.schoolYear.findUnique).mockResolvedValue({
      id: "sy-1",
      is_active: true,
      is_archived: false,
      active_semester: AcademicSemester.FIRST,
    } as never);

    const result = await activateSchoolYear("sy-1");

    expect(result).toEqual({ success: false, error: "School year is already active" });
  });

  it("rejects activation of an archived school year", async () => {
    vi.mocked(prisma.schoolYear.findUnique).mockResolvedValue({
      id: "sy-1",
      is_active: false,
      is_archived: true,
      active_semester: AcademicSemester.FIRST,
    } as never);

    const result = await activateSchoolYear("sy-1");

    expect(result).toEqual({
      success: false,
      error: "Cannot activate an archived school year",
    });
  });

  it("activates the school year atomically deactivating any prior active one", async () => {
    vi.mocked(prisma.schoolYear.findUnique).mockResolvedValue({
      id: "sy-2",
      is_active: false,
      is_archived: false,
      active_semester: AcademicSemester.FIRST,
    } as never);
    vi.mocked(prisma.schoolYear.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.schoolYear.update).mockResolvedValue({ id: "sy-2" } as never);

    const result = await activateSchoolYear("sy-2");

    expect(result).toEqual({ success: true, data: { id: "sy-2" } });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(prisma.schoolYear.updateMany).toHaveBeenCalledWith({
      where: { is_active: true, id: { not: "sy-2" } },
      data: {
        is_active: false,
        active_semester: null,
        active_semester_activated_by: null,
        active_semester_activated_at: null,
      },
    });
    expect(prisma.schoolYear.update).toHaveBeenCalledWith({
      where: { id: "sy-2" },
      data: { is_active: true },
    });
    expect(invalidateAcademicPeriodReadModelTagsMock).toHaveBeenCalledWith({
      activePeriodChanged: true,
      schoolYearStateChanged: true,
    });
  });

  it("rejects activation when the current active school year contains an active period", async () => {
    vi.mocked(prisma.schoolYear.findUnique).mockResolvedValue({
      id: "sy-2",
      is_active: false,
      is_archived: false,
      active_semester: AcademicSemester.FIRST,
    } as never);
    vi.mocked(prisma.academicTermInstance.findFirst).mockResolvedValue({
      id: "ti-active",
    } as never);

    const result = await activateSchoolYear("sy-2");

    expect(result).toEqual({
      success: false,
      error:
        "Cannot activate a school year while the current active school year contains an active period",
    });
    expect(prisma.schoolYear.updateMany).not.toHaveBeenCalled();
    expect(prisma.schoolYear.update).not.toHaveBeenCalled();
  });

  it("maps a concurrent one-active unique violation to a retry error", async () => {
    vi.mocked(prisma.schoolYear.findUnique).mockResolvedValue({
      id: "sy-2",
      is_active: false,
      is_archived: false,
      active_semester: AcademicSemester.FIRST,
    } as never);
    vi.mocked(prisma.schoolYear.update).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "6" })
    );

    const result = await activateSchoolYear("sy-2");

    expect(result).toEqual({
      success: false,
      error: "Another school year is already active; retry the activation",
    });
    expect(invalidateAcademicPeriodReadModelTagsMock).not.toHaveBeenCalled();
  });

  it("maps a serialization conflict to the same retry error", async () => {
    vi.mocked(prisma.schoolYear.findUnique).mockResolvedValue({
      id: "sy-2",
      is_active: false,
      is_archived: false,
      active_semester: AcademicSemester.FIRST,
    } as never);
    vi.mocked(prisma.schoolYear.update).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("conflict", { code: "P2034", clientVersion: "6" })
    );

    const result = await activateSchoolYear("sy-2");

    expect(result).toEqual({
      success: false,
      error: "Another school year is already active; retry the activation",
    });
  });
});

describe("manage-school-years / deactivateSchoolYear", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary);
    vi.mocked(prisma.$transaction).mockImplementation((callback) =>
      callback(prisma as never)
    );
  });

  it("deactivates an active school year and clears active_semester", async () => {
    vi.mocked(prisma.schoolYear.findUnique).mockResolvedValue({
      id: "sy-1",
      is_active: true,
      is_archived: false,
    } as never);
    vi.mocked(prisma.academicTermInstance.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.schoolYear.update).mockResolvedValue({ id: "sy-1" } as never);

    const result = await deactivateSchoolYear("sy-1");

    expect(result).toEqual({ success: true, data: { id: "sy-1" } });
    expect(prisma.schoolYear.update).toHaveBeenCalledWith({
      where: { id: "sy-1" },
      data: {
        is_active: false,
        active_semester: null,
        active_semester_activated_by: null,
        active_semester_activated_at: null,
      },
    });
    expect(invalidateAcademicPeriodReadModelTagsMock).toHaveBeenCalledWith({
      activePeriodChanged: true,
      schoolYearStateChanged: true,
    });
  });

  it("rejects deactivation when the school year contains an ACTIVE period", async () => {
    vi.mocked(prisma.schoolYear.findUnique).mockResolvedValue({
      id: "sy-1",
      is_active: true,
      is_archived: false,
    } as never);
    vi.mocked(prisma.academicTermInstance.findFirst).mockResolvedValue({
      id: "ti-active",
    } as never);

    const result = await deactivateSchoolYear("sy-1");

    expect(result).toEqual({
      success: false,
      error: "Cannot deactivate a school year that contains an active period",
    });
    expect(prisma.schoolYear.update).not.toHaveBeenCalled();
  });

  it("rejects deactivation of a school year that is not active", async () => {
    vi.mocked(prisma.schoolYear.findUnique).mockResolvedValue({
      id: "sy-1",
      is_active: false,
      is_archived: false,
    } as never);
    vi.mocked(prisma.academicTermInstance.findFirst).mockResolvedValue(null);

    const result = await deactivateSchoolYear("sy-1");

    expect(result).toEqual({ success: false, error: "School year is not active" });
    expect(prisma.schoolYear.update).not.toHaveBeenCalled();
  });

  it("rejects deactivation of an archived school year", async () => {
    vi.mocked(prisma.schoolYear.findUnique).mockResolvedValue({
      id: "sy-1",
      is_active: true,
      is_archived: true,
    } as never);

    const result = await deactivateSchoolYear("sy-1");

    expect(result).toEqual({
      success: false,
      error: "Cannot modify an archived school year",
    });
    expect(prisma.schoolYear.update).not.toHaveBeenCalled();
  });

  it("maps a serialization conflict to a retry error", async () => {
    vi.mocked(prisma.schoolYear.findUnique).mockResolvedValue({
      id: "sy-1",
      is_active: true,
      is_archived: false,
    } as never);
    vi.mocked(prisma.academicTermInstance.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.schoolYear.update).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("conflict", { code: "P2034", clientVersion: "6" })
    );

    const result = await deactivateSchoolYear("sy-1");

    expect(result).toEqual({
      success: false,
      error: "School year changed; retry the deactivation",
    });
    expect(invalidateAcademicPeriodReadModelTagsMock).not.toHaveBeenCalled();
  });
});

describe("manage-school-years / setActiveSemester", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary);
    vi.mocked(prisma.academicTermInstance.findFirst).mockReset();
    vi.mocked(prisma.$transaction).mockImplementation((callback) =>
      callback(prisma as never)
    );
  });

  it("updates active_semester with activation audit fields on an active school year", async () => {
    vi.mocked(prisma.schoolYear.findUnique).mockResolvedValue({
      id: "sy-1",
      is_active: true,
      is_archived: false,
    } as never);
    vi.mocked(prisma.schoolYear.update).mockResolvedValue({ id: "sy-1" } as never);

    const result = await setActiveSemester("sy-1", AcademicSemester.SECOND);

    expect(result).toEqual({ success: true, data: { id: "sy-1" } });
    expect(prisma.schoolYear.update).toHaveBeenCalledWith({
      where: { id: "sy-1" },
      data: expect.objectContaining({
        active_semester: AcademicSemester.SECOND,
        active_semester_activated_by: "secretary-1",
        active_semester_activated_at: expect.any(Date),
      }),
    });
    expect(invalidateAcademicPeriodReadModelTagsMock).toHaveBeenCalledWith({
      activePeriodChanged: true,
      schoolYearStateChanged: true,
    });
  });

  it("rejects changing the semester while a period in another semester is active", async () => {
    vi.mocked(prisma.schoolYear.findUnique).mockResolvedValue({
      id: "sy-1",
      is_active: true,
      is_archived: false,
    } as never);
    vi.mocked(prisma.academicTermInstance.findFirst).mockResolvedValue({
      id: "ti-active-first",
    } as never);

    const result = await setActiveSemester("sy-1", AcademicSemester.SECOND);

    expect(result).toEqual({
      success: false,
      error:
        "Cannot change the active semester while a period in another semester is active",
    });
    expect(prisma.schoolYear.update).not.toHaveBeenCalled();
  });

  it("rejects setting a semester on an inactive school year", async () => {
    vi.mocked(prisma.schoolYear.findUnique).mockResolvedValue({
      id: "sy-1",
      is_active: false,
      is_archived: false,
    } as never);

    const result = await setActiveSemester("sy-1", AcademicSemester.FIRST);

    expect(result).toEqual({
      success: false,
      error: "Activate the school year before setting an active semester",
    });
    expect(prisma.schoolYear.update).not.toHaveBeenCalled();
  });

  it("rejects setting a semester on an archived school year", async () => {
    vi.mocked(prisma.schoolYear.findUnique).mockResolvedValue({
      id: "sy-1",
      is_active: true,
      is_archived: true,
    } as never);

    const result = await setActiveSemester("sy-1", AcademicSemester.FIRST);

    expect(result).toEqual({
      success: false,
      error: "Cannot modify an archived school year",
    });
    expect(prisma.schoolYear.update).not.toHaveBeenCalled();
  });
});
