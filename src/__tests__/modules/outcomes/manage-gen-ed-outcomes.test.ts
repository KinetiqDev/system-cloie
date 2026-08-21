import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { createPrismaUniqueConstraintError } from "@/__tests__/helpers/prisma-test-helpers";

const {
  institutionalOutcomeFindManyMock,
  institutionalOutcomeFindUniqueMock,
  institutionalOutcomeCreateMock,
  institutionalOutcomeUpdateMock,
  programFindUniqueMock,
  resolveAuthSessionMock,
  revalidateAssignmentMock,
  resolveProgramHeadContextMock,
  courseAssignmentFindFirstMock,
  ciloFindUniqueMock,
} = vi.hoisted(() => ({
  institutionalOutcomeFindManyMock: vi.fn(),
  institutionalOutcomeFindUniqueMock: vi.fn(),
  institutionalOutcomeCreateMock: vi.fn(),
  institutionalOutcomeUpdateMock: vi.fn(),
  programFindUniqueMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
  revalidateAssignmentMock: vi.fn(),
  resolveProgramHeadContextMock: vi.fn(),
  courseAssignmentFindFirstMock: vi.fn(),
  ciloFindUniqueMock: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
  revalidateProgramHeadAssignment: revalidateAssignmentMock,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    institutionalOutcome: {
      findMany: institutionalOutcomeFindManyMock,
      findUnique: institutionalOutcomeFindUniqueMock,
      create: institutionalOutcomeCreateMock,
      update: institutionalOutcomeUpdateMock,
    },
    pLO: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    cILO: {
      findMany: vi.fn(),
      findUnique: ciloFindUniqueMock,
    },
    program: {
      findUnique: programFindUniqueMock,
    },
    courseAssignment: {
      findFirst: courseAssignmentFindFirstMock,
    },
    programHeadAssignment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    course: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(async (cb: (tx: unknown) => unknown) =>
      cb({
        institutionalOutcome: {
          findMany: institutionalOutcomeFindManyMock,
          findUnique: institutionalOutcomeFindUniqueMock,
          create: institutionalOutcomeCreateMock,
          update: institutionalOutcomeUpdateMock,
        },
        pLO: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
        cILO: { findUnique: ciloFindUniqueMock, findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
        program: { findUnique: programFindUniqueMock },
        courseAssignment: { findFirst: courseAssignmentFindFirstMock },
        programHeadAssignment: { findFirst: vi.fn() },
      })
    ),
  },
}));

const COORDINATOR_SESSION = {
  userId: "coord-1",
  email: "coord@acd.edu.ph",
  roles: [ROLES.GEN_ED_COORDINATOR],
  activeRole: ROLES.GEN_ED_COORDINATOR,
  studentProfileId: null,
  profileGate: null,
};

function nonCoordinatorSession(role: (typeof ROLES)[keyof typeof ROLES]) {
  return {
    userId: `${role.toLowerCase()}-1`,
    email: `${role.toLowerCase()}@acd.edu.ph`,
    roles: [role],
    activeRole: role,
    studentProfileId: null,
    profileGate: null,
  };
}

describe("manage-gen-ed-outcomes", () => {
  let listInstitutionalOutcomes: typeof import("@/features/outcomes/services/manage-gen-ed-outcomes").listInstitutionalOutcomes;
  let createILO: typeof import("@/features/outcomes/services/manage-gen-ed-outcomes").createILO;
  let updateILO: typeof import("@/features/outcomes/services/manage-gen-ed-outcomes").updateILO;
  let archiveILO: typeof import("@/features/outcomes/services/manage-gen-ed-outcomes").archiveILO;
  let restoreILO: typeof import("@/features/outcomes/services/manage-gen-ed-outcomes").restoreILO;
  let reorderILOs: typeof import("@/features/outcomes/services/manage-gen-ed-outcomes").reorderILOs;
  let prepareOutcomeWrite: typeof import("@/features/outcomes/services/manage-outcome-writes").prepareOutcomeWrite;

  beforeEach(async () => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue(COORDINATOR_SESSION);
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        userId: "coord-1",
        authorizedPrograms: [],
        selectedProgram: { id: "p", code: "X", name: "X" },
      },
    });
    revalidateAssignmentMock.mockResolvedValue(null);
    institutionalOutcomeFindManyMock.mockResolvedValue([]);
    institutionalOutcomeFindUniqueMock.mockResolvedValue(null);
    institutionalOutcomeCreateMock.mockResolvedValue({ id: "ilo-1" });
    institutionalOutcomeUpdateMock.mockResolvedValue({ id: "ilo-1" });

    const mod = await import("@/features/outcomes/services/manage-gen-ed-outcomes");
    listInstitutionalOutcomes = mod.listInstitutionalOutcomes;
    createILO = mod.createILO;
    updateILO = mod.updateILO;
    archiveILO = mod.archiveILO;
    restoreILO = mod.restoreILO;
    reorderILOs = mod.reorderILOs;

    const writes = await import("@/features/outcomes/services/manage-outcome-writes");
    prepareOutcomeWrite = writes.prepareOutcomeWrite;
  });

  it("coordinator can list ILOs ordered", async () => {
    const now = new Date();
    institutionalOutcomeFindManyMock.mockResolvedValue([
      {
        id: "ilo-1",
        code: "ILO-1",
        description: "Think",
        order: 0,
        is_active: true,
        created_at: now,
        updated_at: now,
        _count: { cilo_mappings: 2 },
      },
    ]);

    const result = await listInstitutionalOutcomes();
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.ilos[0].code).toBe("ILO-1");
    expect(result.data.ilos[0]._count.cilo_institutional_outcome_mappings).toBe(2);
    expect(institutionalOutcomeFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ order: "asc" }, { code: "asc" }] })
    );
  });

  it("non-coordinator cannot list", async () => {
    resolveAuthSessionMock.mockResolvedValue(nonCoordinatorSession(ROLES.FACULTY));
    const result = await listInstitutionalOutcomes();
    expect(result.success).toBe(false);
  });

  it("coordinator create succeeds college-wide", async () => {
    institutionalOutcomeFindManyMock.mockResolvedValue([]);
    institutionalOutcomeCreateMock.mockResolvedValue({ id: "ilo-1" });
    const result = await createILO({ code: "ilo-1", description: "Valid description" });
    expect(result).toEqual({ success: true, data: { id: "ilo-1" } });
    expect(institutionalOutcomeCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ code: "ILO-1" }) })
    );
  });

  it("duplicate code maps to college-wide error", async () => {
    institutionalOutcomeFindManyMock.mockResolvedValue([]);
    institutionalOutcomeCreateMock.mockRejectedValue(createPrismaUniqueConstraintError());
    const result = await createILO({ code: "ILO-1", description: "Another valid description" });
    expect(result).toEqual({
      success: false,
      error: "Institutional Outcome code already exists.",
    });
  });

  it("non-coordinator any ILO write incl. crafted prepareOutcomeWrite denied", async () => {
    for (const role of [
      ROLES.SECRETARY,
      ROLES.DEAN,
      ROLES.PROGRAM_HEAD,
      ROLES.FACULTY,
      ROLES.STUDENT,
    ] as const) {
      resolveAuthSessionMock.mockResolvedValue(nonCoordinatorSession(role));
      const writes = await import("@/features/outcomes/services/manage-outcome-writes");
      const review = await writes.prepareOutcomeWrite({
        kind: "ILO",
        action: "create",
        code: "ILO-9",
        description: "Crafted attempt",
      });
      expect(review).toEqual({
        success: false,
        error: "You do not have permission to modify this outcome.",
      });
      const svcResult = await createILO({ code: "ILO-9", description: "Crafted attempt valid" });
      expect(svcResult.success).toBe(false);
      if (!svcResult.success) {
        expect(svcResult.error).toContain("You do not have permission");
      }
      // reset for next iteration
      resolveAuthSessionMock.mockResolvedValue(nonCoordinatorSession(role));
    }
  });

  it("stale freshnessToken rejected", async () => {
    institutionalOutcomeFindManyMock.mockResolvedValue([{ id: "ilo-1", order: 0 }]);
    institutionalOutcomeFindUniqueMock.mockResolvedValue({
      id: "ilo-1",
      code: "ILO-1",
      description: "Old",
      order: 0,
      is_active: true,
    });
    const review = await prepareOutcomeWrite({
      kind: "ILO",
      action: "update",
      id: "ilo-1",
      code: "ILO-1",
      description: "New valid description",
    });
    expect(review.success).toBe(true);
    if (!review.success) return;
    // Simulate concurrent writer changing state
    institutionalOutcomeFindUniqueMock.mockResolvedValue({
      id: "ilo-1",
      code: "ILO-CHANGED",
      description: "Changed",
      order: 0,
      is_active: true,
    });
    const { commitOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    const result = await commitOutcomeWrite(review.data, true);
    expect(result).toEqual({
      success: false,
      error: "Outcome changed after review. Prepare a new review.",
    });
  });

  it("reorder with missing ids rejected college-wide", async () => {
    institutionalOutcomeFindManyMock.mockResolvedValue([
      { id: "ilo-1", order: 0 },
      { id: "ilo-2", order: 1 },
    ]);
    const result = await reorderILOs(["ilo-1"]);
    expect(result).toEqual({
      success: false,
      error: "Institutional Outcomes must be a complete unique college-wide order.",
    });
  });

  it("reorder with duplicate ids rejected", async () => {
    institutionalOutcomeFindManyMock.mockResolvedValue([
      { id: "ilo-1", order: 0 },
      { id: "ilo-2", order: 1 },
    ]);
    const result = await reorderILOs(["ilo-1", "ilo-1"]);
    expect(result).toEqual({
      success: false,
      error: "Institutional Outcomes must be a complete unique college-wide order.",
    });
  });

  it("reorder with foreign ids rejected", async () => {
    institutionalOutcomeFindManyMock.mockResolvedValue([
      { id: "ilo-1", order: 0 },
      { id: "ilo-2", order: 1 },
    ]);
    const result = await reorderILOs(["ilo-1", "ilo-foreign"]);
    expect(result).toEqual({
      success: false,
      error: "Institutional Outcomes must be a complete unique college-wide order.",
    });
  });

  it("reorder succeeds", async () => {
    institutionalOutcomeFindManyMock.mockResolvedValue([
      { id: "ilo-1", order: 0 },
      { id: "ilo-2", order: 1 },
    ]);
    institutionalOutcomeUpdateMock.mockResolvedValue({ id: "ilo-1" });
    const result = await reorderILOs(["ilo-2", "ilo-1"]);
    expect(result).toEqual({ success: true, data: undefined });
  });

  it("archive and restore retain code uniqueness via is_active toggle", async () => {
    institutionalOutcomeFindUniqueMock.mockResolvedValue({ id: "ilo-1" });
    institutionalOutcomeUpdateMock.mockResolvedValue({ id: "ilo-1" });
    institutionalOutcomeFindManyMock.mockResolvedValue([
      { id: "ilo-1", code: "ILO-1", description: "x", order: 0, is_active: true },
    ]);
    const a = await archiveILO("ilo-1");
    expect(a).toEqual({ success: true, data: undefined });
    institutionalOutcomeFindUniqueMock.mockResolvedValue({
      id: "ilo-1",
      code: "ILO-1",
      description: "x",
      order: 0,
      is_active: false,
    });
    const r = await restoreILO("ilo-1");
    expect(r).toEqual({ success: true, data: undefined });
  });
});
