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
  resolveProgramHeadContextMock,
  revalidateProgramHeadAssignmentMock,
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
  resolveProgramHeadContextMock: vi.fn(),
  revalidateProgramHeadAssignmentMock: vi.fn(),
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

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
  revalidateProgramHeadAssignment: revalidateProgramHeadAssignmentMock,
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
  let restoreGO: typeof import("@/features/outcomes/services/manage-program-head-outcomes").restoreGO;
  let listCILOMappingsForProgram: typeof import("@/features/outcomes/services/manage-program-head-outcomes").listCILOMappingsForProgram;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default: PH is authenticated with an active program assignment
    resolveAuthSessionMock.mockResolvedValue(PH_SESSION);
    programHeadAssignmentFindManyMock.mockResolvedValue([{ program_id: PROGRAM_ID }]);
    programHeadAssignmentFindFirstMock.mockResolvedValue({ id: "assignment-1" });
    resolveProgramHeadContextMock.mockImplementation(async (programId: string) => {
      const session = await resolveAuthSessionMock();
      if (!session || session.activeRole !== ROLES.PROGRAM_HEAD) {
        return { success: false, error: "Program Head authentication is required." };
      }
      const assignments = await programHeadAssignmentFindManyMock();
      if (
        !assignments.some(
          (assignment: { program_id: string }) => assignment.program_id === programId
        )
      ) {
        return {
          success: false,
          error: "No active program assignment found for this Program Head.",
        };
      }
      return {
        success: true,
        data: {
          userId: session.userId,
          authorizedPrograms: [{ id: programId, code: "BSIT", name: "BS Information Technology" }],
          selectedProgram: { id: programId, code: "BSIT", name: "BS Information Technology" },
        },
      };
    });
    revalidateProgramHeadAssignmentMock.mockImplementation(async (tx, input) => {
      const assignment = await tx.programHeadAssignment.findFirst({
        where: { program_head_id: input.userId, program_id: input.programId, is_active: true },
      });
      return assignment
        ? { id: input.programId, code: "BSIT", name: "BS Information Technology" }
        : null;
    });
    transactionMock.mockImplementation(async (callback) =>
      callback({
        gO: {
          findMany: goFindManyMock,
          findUnique: goFindUniqueMock,
          create: goCreateMock,
          update: goUpdateMock,
        },
        program: { findUnique: programFindUniqueMock },
        programHeadAssignment: { findFirst: programHeadAssignmentFindFirstMock },
      })
    );

    const mod = await import("@/features/outcomes/services/manage-program-head-outcomes");
    listProgramGOs = mod.listProgramGOs;
    createGO = mod.createGO;
    updateGO = mod.updateGO;
    deleteGO = mod.deleteGO;
    reorderGOs = mod.reorderGOs;
    restoreGO = mod.restoreGO;
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

    const result = await listProgramGOs(PROGRAM_ID);

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

  it("lists only the deliberately selected Program when multiple assignments exist", async () => {
    const selectedProgramId = "program-2";
    programHeadAssignmentFindManyMock.mockResolvedValue([
      { program_id: PROGRAM_ID },
      { program_id: selectedProgramId },
    ]);
    programFindUniqueMock.mockResolvedValue({
      id: selectedProgramId,
      code: "BSED",
      name: "Secondary Education",
    });
    goFindManyMock.mockResolvedValue([]);

    const result = await listProgramGOs(selectedProgramId);

    expect(result).toEqual({
      success: true,
      data: {
        gos: [],
        program: { id: selectedProgramId, code: "BSED", name: "Secondary Education" },
      },
    });
    expect(goFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { program_id: selectedProgramId } })
    );
  });

  it("excludes General Education courses from program mapping review", async () => {
    const selectedProgramId = "program-2";
    programHeadAssignmentFindManyMock.mockResolvedValue([{ program_id: selectedProgramId }]);
    goFindManyMock.mockResolvedValue([]);
    courseFindManyMock.mockResolvedValue([]);

    const result = await listCILOMappingsForProgram(selectedProgramId);

    expect(result).toEqual({ success: true, data: [] });
    expect(courseFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          is_active: true,
          program_id: selectedProgramId,
          course_assignments: {
            some: {
              program_id: selectedProgramId,
              is_active: true,
              term_instance: { status: "ACTIVE" },
            },
          },
        }),
      })
    );
    // Ensure no GENERAL_EDUCATION clause leaks into the query
    const where = courseFindManyMock.mock.calls[0][0].where;
    expect(where.OR).toBeUndefined();
  });

  it("lists every active GO with per-pair manifestations and exhaustive readiness per CILO", async () => {
    const selectedProgramId = "program-1";
    programHeadAssignmentFindManyMock.mockResolvedValue([{ program_id: selectedProgramId }]);
    goFindManyMock.mockResolvedValue([
      { id: "go-1", code: "GO-1", description: "Analyze problems" },
      { id: "go-2", code: "GO-2", description: "Design solutions" },
    ]);
    courseFindManyMock.mockResolvedValue([
      {
        id: "course-ps",
        code: "CS101",
        title: "Introduction to Computing",
        course_scope: "PROGRAM_SPECIFIC",
        cilos: [
          {
            id: "cilo-aligned",
            description: "Design a solution",
            cilo_mappings: [
              {
                id: "mapping-1",
                manifestation: "LEARNING",
                go: {
                  id: "go-1",
                  code: "GO-1",
                  description: "Analyze problems",
                  program_id: selectedProgramId,
                  is_active: true,
                },
              },
              {
                id: "mapping-2",
                manifestation: "PRACTICE",
                go: {
                  id: "go-2",
                  code: "GO-2",
                  description: "Design solutions",
                  program_id: selectedProgramId,
                  is_active: true,
                },
              },
            ],
            cilo_institutional_outcome_mappings: [],
          },
          {
            id: "cilo-legacy",
            description: "Legacy classification",
            cilo_mappings: [
              {
                id: "mapping-3",
                manifestation: null,
                go: {
                  id: "go-1",
                  code: "GO-1",
                  description: "Analyze problems",
                  program_id: selectedProgramId,
                  is_active: true,
                },
              },
            ],
            cilo_institutional_outcome_mappings: [],
          },
          {
            id: "cilo-partial",
            description: "One pair classified",
            cilo_mappings: [
              {
                id: "mapping-4",
                manifestation: "OPPORTUNITY",
                go: {
                  id: "go-1",
                  code: "GO-1",
                  description: "Analyze problems",
                  program_id: selectedProgramId,
                  is_active: true,
                },
              },
            ],
            cilo_institutional_outcome_mappings: [],
          },
          {
            id: "cilo-gap",
            description: "No target yet",
            cilo_mappings: [],
            cilo_institutional_outcome_mappings: [],
          },
          {
            id: "cilo-archived-target",
            description: "Only archived target",
            cilo_mappings: [
              {
                id: "mapping-5",
                manifestation: "LEARNING",
                go: {
                  id: "go-3",
                  code: "GO-3",
                  description: "Retired",
                  program_id: selectedProgramId,
                  is_active: false,
                },
              },
            ],
            cilo_institutional_outcome_mappings: [],
          },
        ],
      },
    ]);

    const result = await listCILOMappingsForProgram(selectedProgramId);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(courseFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          is_active: true,
          program_id: selectedProgramId,
          course_assignments: {
            some: {
              program_id: selectedProgramId,
              is_active: true,
              term_instance: { status: "ACTIVE" },
            },
          },
        }),
      })
    );
    expect(goFindManyMock).toHaveBeenCalledWith({
      where: { program_id: selectedProgramId, is_active: true },
      select: { id: true, code: true, description: true },
      orderBy: [{ order: "asc" }, { code: "asc" }],
    });
    expect(result.data[0].gos).toEqual([
      { id: "go-1", code: "GO-1", description: "Analyze problems" },
      { id: "go-2", code: "GO-2", description: "Design solutions" },
    ]);
    expect(result.data[0].archivedGos).toEqual([
      { id: "go-3", code: "GO-3", description: "Retired" },
    ]);
    expect(result.data[0].cilos).toEqual([
      {
        id: "cilo-aligned",
        description: "Design a solution",
        manifestations: [
          { goId: "go-1", manifestation: "LEARNING" },
          { goId: "go-2", manifestation: "PRACTICE" },
        ],
        archivedManifestations: [],
        readiness: "ready",
      },
      {
        id: "cilo-legacy",
        description: "Legacy classification",

        manifestations: [
          { goId: "go-1", manifestation: null },
          { goId: "go-2", manifestation: null },
        ],
        archivedManifestations: [],
        readiness: "incomplete-mapping",
      },
      {
        id: "cilo-partial",
        description: "One pair classified",

        manifestations: [
          { goId: "go-1", manifestation: "OPPORTUNITY" },
          { goId: "go-2", manifestation: null },
        ],
        archivedManifestations: [],
        readiness: "incomplete-mapping",
      },
      {
        id: "cilo-gap",
        description: "No target yet",

        manifestations: [
          { goId: "go-1", manifestation: null },
          { goId: "go-2", manifestation: null },
        ],
        archivedManifestations: [],
        readiness: "incomplete-mapping",
      },
      {
        id: "cilo-archived-target",
        description: "Only archived target",

        manifestations: [
          { goId: "go-1", manifestation: null },
          { goId: "go-2", manifestation: null },
        ],
        archivedManifestations: [{ goId: "go-3", manifestation: "LEARNING" }],
        readiness: "incomplete-mapping",
      },
    ]);
  });

  it("reports every Program-specific CILO incomplete when the Program has no active GOs", async () => {
    const selectedProgramId = "program-1";
    programHeadAssignmentFindManyMock.mockResolvedValue([{ program_id: selectedProgramId }]);
    goFindManyMock.mockResolvedValue([]);
    courseFindManyMock.mockResolvedValue([
      {
        id: "course-ps",
        code: "CS101",
        title: "Introduction to Computing",
        course_scope: "PROGRAM_SPECIFIC",
        cilos: [
          {
            id: "cilo-1",
            description: "Design a solution",
            cilo_mappings: [],
            cilo_institutional_outcome_mappings: [],
          },
        ],
      },
    ]);

    const result = await listCILOMappingsForProgram(selectedProgramId);

    expect(result).toEqual({
      success: true,
      data: [
        {
          courseId: "course-ps",
          courseCode: "CS101",
          courseTitle: "Introduction to Computing",
          gos: [],
          archivedGos: [],
          cilos: [
            {
              id: "cilo-1",
              description: "Design a solution",

              manifestations: [],
              archivedManifestations: [],
              readiness: "incomplete-mapping",
            },
          ],
        },
      ],
    });
  });

  // ─── createGO ────────────────────────────────────────────────────────

  it("PH can create a GO within assigned program", async () => {
    goFindManyMock.mockResolvedValue([]);
    programFindUniqueMock.mockResolvedValue({ is_active: true });
    goCreateMock.mockResolvedValue({ id: GO_ID });

    const result = await createGO({
      programId: PROGRAM_ID,
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
      programId: PROGRAM_ID,
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
      programId: PROGRAM_ID,
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
      programId: PROGRAM_ID,
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
      programId: PROGRAM_ID,
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

  it("rejects a BEED GO from a selected BSED context", async () => {
    const selectedProgramId = "program-2";
    programHeadAssignmentFindManyMock.mockResolvedValue([
      { program_id: PROGRAM_ID },
      { program_id: selectedProgramId },
    ]);
    goFindUniqueMock.mockResolvedValue({ id: GO_ID, program_id: PROGRAM_ID });

    const result = await updateGO({
      programId: selectedProgramId,
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

    const result = await deleteGO(PROGRAM_ID, GO_ID);

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

    const result = await deleteGO(PROGRAM_ID, GO_ID);

    expect(result).toEqual({ success: true, data: undefined });
    expect(goUpdateMock).toHaveBeenCalledWith({ where: { id: GO_ID }, data: { is_active: false } });
  });

  // ─── restoreGO ───────────────────────────────────────────────────────

  it("PH restores an archived GO within the assigned program", async () => {
    goFindUniqueMock.mockResolvedValue({
      id: GO_ID,
      program_id: PROGRAM_ID,
      code: "GO-1",
      description: "Original",
      order: 0,
      is_active: false,
    });
    goUpdateMock.mockResolvedValue({ id: GO_ID });

    const result = await restoreGO(PROGRAM_ID, GO_ID);

    expect(result).toEqual({ success: true, data: undefined });
    expect(goUpdateMock).toHaveBeenCalledWith({ where: { id: GO_ID }, data: { is_active: true } });
  });

  it("PH cannot restore a GO outside the assigned program", async () => {
    goFindUniqueMock.mockResolvedValue({ id: GO_ID, program_id: "other-program" });

    const result = await restoreGO(PROGRAM_ID, GO_ID);

    expect(result).toEqual({
      success: false,
      error: "You do not have permission to restore this Graduate Outcome.",
    });
    expect(goUpdateMock).not.toHaveBeenCalled();
  });

  it("restoreGO fails safely when the GO does not exist", async () => {
    goFindUniqueMock.mockResolvedValue(null);

    const result = await restoreGO(PROGRAM_ID, GO_ID);

    expect(result).toEqual({ success: false, error: "Graduate Outcome not found." });
    expect(goUpdateMock).not.toHaveBeenCalled();
  });

  // ─── reorderGOs ──────────────────────────────────────────────────────

  it("reorder validates all IDs belong to PH's program", async () => {
    goFindManyMock.mockResolvedValue([{ id: "go-1", order: 0 }]);

    const result = await reorderGOs(PROGRAM_ID, ["go-1", "go-2"]);

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

    const result = await reorderGOs(PROGRAM_ID, ["go-2", "go-1"]);

    expect(result).toEqual({ success: true, data: undefined });
    expect(transactionMock).toHaveBeenCalled();
  });

  // ─── Auth guards ─────────────────────────────────────────────────────

  it("rejects unauthenticated requests", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    const result = await createGO({
      programId: PROGRAM_ID,
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
      programId: PROGRAM_ID,
      code: "GO-1",
      description: "Test",
    });

    expect(result).toEqual({
      success: false,
      error: "Program Head authentication is required.",
    });
  });
});
