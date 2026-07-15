import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { createPrismaUniqueConstraintError } from "@/__tests__/helpers/prisma-test-helpers";

const {
  goCreateMock,
  goFindManyMock,
  goFindUniqueMock,
  goUpdateMock,
  programFindUniqueMock,
  programHeadAssignmentFindManyMock,
  programHeadAssignmentFindFirstMock,
  resolveAuthSessionMock,
  transactionMock,
  courseFindManyMock,
} = vi.hoisted(() => ({
  goCreateMock: vi.fn(),
  goFindManyMock: vi.fn(),
  goFindUniqueMock: vi.fn(),
  goUpdateMock: vi.fn(),
  programFindUniqueMock: vi.fn(),
  programHeadAssignmentFindManyMock: vi.fn(),
  programHeadAssignmentFindFirstMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
  transactionMock: vi.fn(),
  courseFindManyMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    gO: {
      create: goCreateMock,
      findMany: goFindManyMock,
      findUnique: goFindUniqueMock,
      update: goUpdateMock,
    },
    program: {
      findUnique: programFindUniqueMock,
    },
    programHeadAssignment: {
      findMany: programHeadAssignmentFindManyMock,
      findFirst: programHeadAssignmentFindFirstMock,
    },
    course: {
      findMany: courseFindManyMock,
    },
    $transaction: transactionMock,
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

const PH_SESSION = {
  userId: "ph-user-1",
  email: "ph@acd.edu.ph",
  roles: [ROLES.PROGRAM_HEAD],
  activeRole: ROLES.PROGRAM_HEAD,
  studentProfileId: null,
  profileGate: null,
};

const PROGRAM_ID = "program-1";
const GO_ID = "go-1";

describe("manage-program-head-outcomes", () => {
  let listProgramGOs: typeof import("@/features/outcomes/services/manage-program-head-outcomes").listProgramGOs;
  let createGO: typeof import("@/features/outcomes/services/manage-program-head-outcomes").createGO;
  let updateGO: typeof import("@/features/outcomes/services/manage-program-head-outcomes").updateGO;
  let deleteGO: typeof import("@/features/outcomes/services/manage-program-head-outcomes").deleteGO;
  let reorderGOs: typeof import("@/features/outcomes/services/manage-program-head-outcomes").reorderGOs;
  let listCILOMappingsForProgram: typeof import("@/features/outcomes/services/manage-program-head-outcomes").listCILOMappingsForProgram;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default: PH is authenticated with an active program assignment
    resolveAuthSessionMock.mockResolvedValue(PH_SESSION);
    programHeadAssignmentFindManyMock.mockResolvedValue([{ program_id: PROGRAM_ID }]);
    programHeadAssignmentFindFirstMock.mockResolvedValue({ id: "assignment-1" });
    transactionMock.mockImplementation(async (callback) => callback({
      gO: {
        findMany: goFindManyMock,
        findUnique: goFindUniqueMock,
        create: goCreateMock,
        update: goUpdateMock,
      },
      program: { findUnique: programFindUniqueMock },
      programHeadAssignment: { findFirst: programHeadAssignmentFindFirstMock },
    }));

    const mod = await import("@/features/outcomes/services/manage-program-head-outcomes");
    listProgramGOs = mod.listProgramGOs;
    createGO = mod.createGO;
    updateGO = mod.updateGO;
    deleteGO = mod.deleteGO;
    reorderGOs = mod.reorderGOs;
    listCILOMappingsForProgram = mod.listCILOMappingsForProgram;
  });

  // ─── listProgramGOs ──────────────────────────────────────────────────

  it("PH can list GOs for assigned program", async () => {
    programFindUniqueMock.mockResolvedValue({
      id: PROGRAM_ID,
      code: "BSIT",
      name: "BS Information Technology",
    });
    goFindManyMock.mockResolvedValue([
      {
        id: GO_ID,
        code: "GO-1",
        description: "Critical Thinking",
        order: 0,
        is_active: true,
        program_id: PROGRAM_ID,
        created_at: new Date(),
        updated_at: new Date(),
        _count: { cilo_mappings: 2 },
      },
    ]);

    const result = await listProgramGOs();

    expect(result).toEqual({
      success: true,
      data: {
        gos: expect.arrayContaining([
          expect.objectContaining({
            id: GO_ID,
            code: "GO-1",
            _count: { cilo_mappings: 2 },
          }),
        ]),
        program: {
          id: PROGRAM_ID,
          code: "BSIT",
          name: "BS Information Technology",
        },
      },
    });
  });

  // ─── createGO ────────────────────────────────────────────────────────

  it("PH can create a GO within assigned program", async () => {
    goFindManyMock.mockResolvedValue([]);
    programFindUniqueMock.mockResolvedValue({ is_active: true });
    goCreateMock.mockResolvedValue({ id: GO_ID });

    const result = await createGO({
      code: "GO-1",
      description: "Critical Thinking",
    });

    expect(result).toEqual({ success: true, data: { id: GO_ID } });
    expect(goCreateMock).toHaveBeenCalledWith({
      data: {
        code: "GO-1",
        description: "Critical Thinking",
        order: 0,
        program_id: PROGRAM_ID,
      },
    });
  });

  it("PH cannot create GO outside assigned program", async () => {
    // Simulate no active assignments
    programHeadAssignmentFindManyMock.mockResolvedValue([]);

    const result = await createGO({
      code: "GO-1",
      description: "Critical Thinking",
    });

    expect(result).toEqual({
      success: false,
      error: "No active program assignment found for this Program Head.",
    });
    expect(goCreateMock).not.toHaveBeenCalled();
  });

  it("unique constraint error on duplicate GO code within program", async () => {
    goFindManyMock.mockResolvedValue([]);
    programFindUniqueMock.mockResolvedValue({ is_active: true });
    goCreateMock.mockRejectedValue(createPrismaUniqueConstraintError());

    const result = await createGO({
      code: "GO-1",
      description: "Duplicate GO",
    });

    expect(result).toEqual({
      success: false,
      error: "Graduate Outcome code already exists.",
    });
  });

  // ─── updateGO ────────────────────────────────────────────────────────

  it("PH can update a GO within scope", async () => {
    goFindUniqueMock.mockResolvedValue({
      id: GO_ID,
      code: "GO-1",
      description: "Original",
      order: 0,
      is_active: true,
      program_id: PROGRAM_ID,
    });
    goUpdateMock.mockResolvedValue({ id: GO_ID });

    const result = await updateGO({
      id: GO_ID,
      code: "GO-1-UPDATED",
      description: "Updated description",
    });

    expect(result).toEqual({ success: true, data: { id: GO_ID } });
    expect(goUpdateMock).toHaveBeenCalledWith({
      where: { id: GO_ID },
      data: {
        code: "GO-1-UPDATED",
        description: "Updated description",
      },
    });
  });

  it("PH cannot update GO outside scope", async () => {
    goFindUniqueMock.mockResolvedValue({
      id: GO_ID,
      program_id: "other-program",
    });

    const result = await updateGO({
      id: GO_ID,
      code: "GO-1",
      description: "Attempt update",
    });

    expect(result).toEqual({
      success: false,
      error: "You do not have permission to modify this Graduate Outcome.",
    });
    expect(goUpdateMock).not.toHaveBeenCalled();
  });

  // ─── deleteGO ────────────────────────────────────────────────────────

  it("PH archives GO without deleting mappings", async () => {
    goFindUniqueMock.mockResolvedValue({
      id: GO_ID,
      program_id: PROGRAM_ID,
      code: "GO-1",
      description: "Original",
      order: 0,
      is_active: true,
    });
    goUpdateMock.mockResolvedValue({ id: GO_ID });

    const result = await deleteGO(GO_ID);

    expect(result).toEqual({ success: true, data: undefined });
    expect(goUpdateMock).toHaveBeenCalledWith({ where: { id: GO_ID }, data: { is_active: false } });
  });

  it("PH archives GO with existing CILO mappings", async () => {
    goFindUniqueMock.mockResolvedValue({
      id: GO_ID,
      program_id: PROGRAM_ID,
      code: "GO-1",
      description: "Original",
      order: 0,
      is_active: true,
    });
    goUpdateMock.mockResolvedValue({ id: GO_ID });

    const result = await deleteGO(GO_ID);

    expect(result).toEqual({ success: true, data: undefined });
    expect(goUpdateMock).toHaveBeenCalledWith({ where: { id: GO_ID }, data: { is_active: false } });
  });

  // ─── reorderGOs ──────────────────────────────────────────────────────

  it("reorder validates all IDs belong to PH's program", async () => {
    goFindManyMock.mockResolvedValue([{ id: "go-1", order: 0 }]);

    const result = await reorderGOs(["go-1", "go-2"]);

    expect(result).toEqual({
      success: false,
      error: "Graduate Outcomes must be a complete unique program order.",
    });
    expect(transactionMock).toHaveBeenCalled();
  });

  it("reorder succeeds when all IDs belong to PH's program", async () => {
    goFindManyMock.mockResolvedValue([
      { id: "go-1", order: 0 },
      { id: "go-2", order: 1 },
    ]);

    const result = await reorderGOs(["go-2", "go-1"]);

    expect(result).toEqual({ success: true, data: undefined });
    expect(transactionMock).toHaveBeenCalled();
  });

  // ─── Auth guards ─────────────────────────────────────────────────────

  it("rejects unauthenticated requests", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    const result = await createGO({
      code: "GO-1",
      description: "Test",
    });

    expect(result).toEqual({
      success: false,
      error: "Program Head authentication is required.",
    });
  });

  it("rejects non-PROGRAM_HEAD role", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      ...PH_SESSION,
      roles: [ROLES.FACULTY],
      activeRole: ROLES.FACULTY,
    });

    const result = await createGO({
      code: "GO-1",
      description: "Test",
    });

    expect(result).toEqual({
      success: false,
      error: "Program Head authentication is required.",
    });
  });
});
