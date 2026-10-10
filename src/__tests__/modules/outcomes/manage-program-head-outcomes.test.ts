import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { createPrismaUniqueConstraintError } from "@/__tests__/helpers/prisma-test-helpers";

const {
  poCreateMock,
  poFindManyMock,
  poFindUniqueMock,
  poUpdateMock,
  programFindUniqueMock,
  programHeadAssignmentFindManyMock,
  programHeadAssignmentFindFirstMock,
  resolveProgramHeadContextMock,
  revalidateProgramHeadAssignmentMock,
  resolveAuthSessionMock,
  transactionMock,
  courseFindManyMock,
} = vi.hoisted(() => ({
  poCreateMock: vi.fn(),
  poFindManyMock: vi.fn(),
  poFindUniqueMock: vi.fn(),
  poUpdateMock: vi.fn(),
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
    pO: {
      create: poCreateMock,
      findMany: poFindManyMock,
      findUnique: poFindUniqueMock,
      update: poUpdateMock,
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
const GO_ID = "po-1";

describe("manage-program-head-outcomes", () => {
  let listProgramPOs: typeof import("@/features/outcomes/services/manage-program-head-outcomes").listProgramPOs;
  let createPO: typeof import("@/features/outcomes/services/manage-program-head-outcomes").createPO;
  let updatePO: typeof import("@/features/outcomes/services/manage-program-head-outcomes").updatePO;
  let deletePO: typeof import("@/features/outcomes/services/manage-program-head-outcomes").deletePO;
  let reorderPOs: typeof import("@/features/outcomes/services/manage-program-head-outcomes").reorderPOs;
  let restorePO: typeof import("@/features/outcomes/services/manage-program-head-outcomes").restorePO;
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
        pO: {
          findMany: poFindManyMock,
          findUnique: poFindUniqueMock,
          create: poCreateMock,
          update: poUpdateMock,
        },
        program: { findUnique: programFindUniqueMock },
        programHeadAssignment: { findFirst: programHeadAssignmentFindFirstMock },
      })
    );

    const mod = await import("@/features/outcomes/services/manage-program-head-outcomes");
    listProgramPOs = mod.listProgramPOs;
    createPO = mod.createPO;
    updatePO = mod.updatePO;
    deletePO = mod.deletePO;
    reorderPOs = mod.reorderPOs;
    restorePO = mod.restorePO;
    listCILOMappingsForProgram = mod.listCILOMappingsForProgram;
  });

  // ─── listProgramPOs ──────────────────────────────────────────────────

  it("PH can list POs for assigned program", async () => {
    programFindUniqueMock.mockResolvedValue({
      id: PROGRAM_ID,
      code: "BSIT",
      name: "BS Information Technology",
    });
    poFindManyMock.mockResolvedValue([
      {
        id: GO_ID,
        code: "PO-1",
        description: "Critical Thinking",
        order: 0,
        is_active: true,
        program_id: PROGRAM_ID,
        created_at: new Date(),
        updated_at: new Date(),
        _count: { cilo_mappings: 2 },
      },
    ]);

    const result = await listProgramPOs(PROGRAM_ID);

    expect(result).toEqual({
      success: true,
      data: {
        pos: expect.arrayContaining([
          expect.objectContaining({
            id: GO_ID,
            code: "PO-1",
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
    poFindManyMock.mockResolvedValue([]);

    const result = await listProgramPOs(selectedProgramId);

    expect(result).toEqual({
      success: true,
      data: {
        pos: [],
        program: { id: selectedProgramId, code: "BSED", name: "Secondary Education" },
      },
    });
    expect(poFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { program_id: selectedProgramId } })
    );
  });

  it("excludes General Education courses from program mapping review", async () => {
    const selectedProgramId = "program-2";
    programHeadAssignmentFindManyMock.mockResolvedValue([{ program_id: selectedProgramId }]);
    poFindManyMock.mockResolvedValue([]);
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

  it("lists every active PO with per-pair manifestations and exhaustive readiness per CILO", async () => {
    const selectedProgramId = "program-1";
    programHeadAssignmentFindManyMock.mockResolvedValue([{ program_id: selectedProgramId }]);
    poFindManyMock.mockResolvedValue([
      { id: "po-1", code: "PO-1", description: "Analyze problems" },
      { id: "po-2", code: "PO-2", description: "Design solutions" },
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
                po: {
                  id: "po-1",
                  code: "PO-1",
                  description: "Analyze problems",
                  program_id: selectedProgramId,
                  is_active: true,
                },
              },
              {
                id: "mapping-2",
                manifestation: "PRACTICE",
                po: {
                  id: "po-2",
                  code: "PO-2",
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
                po: {
                  id: "po-1",
                  code: "PO-1",
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
                po: {
                  id: "po-1",
                  code: "PO-1",
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
                po: {
                  id: "po-3",
                  code: "PO-3",
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
    expect(poFindManyMock).toHaveBeenCalledWith({
      where: { program_id: selectedProgramId, is_active: true },
      select: { id: true, code: true, description: true },
      orderBy: [{ order: "asc" }, { code: "asc" }],
    });
    expect(result.data[0].pos).toEqual([
      { id: "po-1", code: "PO-1", description: "Analyze problems" },
      { id: "po-2", code: "PO-2", description: "Design solutions" },
    ]);
    expect(result.data[0].archivedGos).toEqual([
      { id: "po-3", code: "PO-3", description: "Retired" },
    ]);
    expect(result.data[0].cilos).toEqual([
      {
        id: "cilo-aligned",
        description: "Design a solution",
        manifestations: [
          { poId: "po-1", manifestation: "LEARNING" },
          { poId: "po-2", manifestation: "PRACTICE" },
        ],
        archivedManifestations: [],
        readiness: "ready",
      },
      {
        id: "cilo-legacy",
        description: "Legacy classification",

        manifestations: [
          { poId: "po-1", manifestation: null },
          { poId: "po-2", manifestation: null },
        ],
        archivedManifestations: [],
        readiness: "incomplete-mapping",
      },
      {
        id: "cilo-partial",
        description: "One pair classified",

        manifestations: [
          { poId: "po-1", manifestation: "OPPORTUNITY" },
          { poId: "po-2", manifestation: null },
        ],
        archivedManifestations: [],
        readiness: "incomplete-mapping",
      },
      {
        id: "cilo-gap",
        description: "No target yet",

        manifestations: [
          { poId: "po-1", manifestation: null },
          { poId: "po-2", manifestation: null },
        ],
        archivedManifestations: [],
        readiness: "incomplete-mapping",
      },
      {
        id: "cilo-archived-target",
        description: "Only archived target",

        manifestations: [
          { poId: "po-1", manifestation: null },
          { poId: "po-2", manifestation: null },
        ],
        archivedManifestations: [{ poId: "po-3", manifestation: "LEARNING" }],
        readiness: "incomplete-mapping",
      },
    ]);
  });

  it("reports every Program-specific CILO incomplete when the Program has no active POs", async () => {
    const selectedProgramId = "program-1";
    programHeadAssignmentFindManyMock.mockResolvedValue([{ program_id: selectedProgramId }]);
    poFindManyMock.mockResolvedValue([]);
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
          pos: [],
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

  // ─── createPO ────────────────────────────────────────────────────────

  it("PH can create a PO within assigned program", async () => {
    poFindManyMock.mockResolvedValue([]);
    programFindUniqueMock.mockResolvedValue({ is_active: true });
    poCreateMock.mockResolvedValue({ id: GO_ID });

    const result = await createPO({
      programId: PROGRAM_ID,
      code: "PO-1",
      description: "Critical Thinking",
    });

    expect(result).toEqual({ success: true, data: { id: GO_ID } });
    expect(poCreateMock).toHaveBeenCalledWith({
      data: {
        code: "PO-1",
        description: "Critical Thinking",
        order: 0,
        program_id: PROGRAM_ID,
      },
    });
  });

  it("PH cannot create PO outside assigned program", async () => {
    // Simulate no active assignments
    programHeadAssignmentFindManyMock.mockResolvedValue([]);

    const result = await createPO({
      programId: PROGRAM_ID,
      code: "PO-1",
      description: "Critical Thinking",
    });

    expect(result).toEqual({
      success: false,
      error: "No active program assignment found for this Program Head.",
    });
    expect(poCreateMock).not.toHaveBeenCalled();
  });

  it("unique constraint error on duplicate PO code within program", async () => {
    poFindManyMock.mockResolvedValue([]);
    programFindUniqueMock.mockResolvedValue({ is_active: true });
    poCreateMock.mockRejectedValue(createPrismaUniqueConstraintError());

    const result = await createPO({
      programId: PROGRAM_ID,
      code: "PO-1",
      description: "Duplicate PO",
    });

    expect(result).toEqual({
      success: false,
      error: "Program Outcome code already exists.",
    });
  });

  // ─── updatePO ────────────────────────────────────────────────────────

  it("PH can update a PO within scope", async () => {
    poFindUniqueMock.mockResolvedValue({
      id: GO_ID,
      code: "PO-1",
      description: "Original",
      order: 0,
      is_active: true,
      program_id: PROGRAM_ID,
    });
    poUpdateMock.mockResolvedValue({ id: GO_ID });

    const result = await updatePO({
      programId: PROGRAM_ID,
      id: GO_ID,
      code: "PO-1-UPDATED",
      description: "Updated description",
    });

    expect(result).toEqual({ success: true, data: { id: GO_ID } });
    expect(poUpdateMock).toHaveBeenCalledWith({
      where: { id: GO_ID },
      data: {
        code: "PO-1-UPDATED",
        description: "Updated description",
      },
    });
  });

  it("PH cannot update PO outside scope", async () => {
    poFindUniqueMock.mockResolvedValue({
      id: GO_ID,
      program_id: "other-program",
    });

    const result = await updatePO({
      programId: PROGRAM_ID,
      id: GO_ID,
      code: "PO-1",
      description: "Attempt update",
    });

    expect(result).toEqual({
      success: false,
      error: "You do not have permission to modify this Program Outcome.",
    });
    expect(poUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects a BEED PO from a selected BSED context", async () => {
    const selectedProgramId = "program-2";
    programHeadAssignmentFindManyMock.mockResolvedValue([
      { program_id: PROGRAM_ID },
      { program_id: selectedProgramId },
    ]);
    poFindUniqueMock.mockResolvedValue({ id: GO_ID, program_id: PROGRAM_ID });

    const result = await updatePO({
      programId: selectedProgramId,
      id: GO_ID,
      code: "PO-1",
      description: "Attempt update",
    });

    expect(result).toEqual({
      success: false,
      error: "You do not have permission to modify this Program Outcome.",
    });
    expect(poUpdateMock).not.toHaveBeenCalled();
  });

  // ─── deletePO ────────────────────────────────────────────────────────

  it("PH archives PO without deleting mappings", async () => {
    poFindUniqueMock.mockResolvedValue({
      id: GO_ID,
      program_id: PROGRAM_ID,
      code: "PO-1",
      description: "Original",
      order: 0,
      is_active: true,
    });
    poUpdateMock.mockResolvedValue({ id: GO_ID });

    const result = await deletePO(PROGRAM_ID, GO_ID);

    expect(result).toEqual({ success: true, data: undefined });
    expect(poUpdateMock).toHaveBeenCalledWith({ where: { id: GO_ID }, data: { is_active: false } });
  });

  it("PH archives PO with existing CILO mappings", async () => {
    poFindUniqueMock.mockResolvedValue({
      id: GO_ID,
      program_id: PROGRAM_ID,
      code: "PO-1",
      description: "Original",
      order: 0,
      is_active: true,
    });
    poUpdateMock.mockResolvedValue({ id: GO_ID });

    const result = await deletePO(PROGRAM_ID, GO_ID);

    expect(result).toEqual({ success: true, data: undefined });
    expect(poUpdateMock).toHaveBeenCalledWith({ where: { id: GO_ID }, data: { is_active: false } });
  });

  // ─── restorePO ───────────────────────────────────────────────────────

  it("PH restores an archived PO within the assigned program", async () => {
    poFindUniqueMock.mockResolvedValue({
      id: GO_ID,
      program_id: PROGRAM_ID,
      code: "PO-1",
      description: "Original",
      order: 0,
      is_active: false,
    });
    poUpdateMock.mockResolvedValue({ id: GO_ID });

    const result = await restorePO(PROGRAM_ID, GO_ID);

    expect(result).toEqual({ success: true, data: undefined });
    expect(poUpdateMock).toHaveBeenCalledWith({ where: { id: GO_ID }, data: { is_active: true } });
  });

  it("PH cannot restore a PO outside the assigned program", async () => {
    poFindUniqueMock.mockResolvedValue({ id: GO_ID, program_id: "other-program" });

    const result = await restorePO(PROGRAM_ID, GO_ID);

    expect(result).toEqual({
      success: false,
      error: "You do not have permission to restore this Program Outcome.",
    });
    expect(poUpdateMock).not.toHaveBeenCalled();
  });

  it("restorePO fails safely when the PO does not exist", async () => {
    poFindUniqueMock.mockResolvedValue(null);

    const result = await restorePO(PROGRAM_ID, GO_ID);

    expect(result).toEqual({ success: false, error: "Program Outcome not found." });
    expect(poUpdateMock).not.toHaveBeenCalled();
  });

  // ─── reorderPOs ──────────────────────────────────────────────────────

  it("reorder validates all IDs belong to PH's program", async () => {
    poFindManyMock.mockResolvedValue([{ id: "po-1", order: 0 }]);

    const result = await reorderPOs(PROGRAM_ID, ["po-1", "po-2"]);

    expect(result).toEqual({
      success: false,
      error: "Program Outcomes must be a complete unique program order.",
    });
    expect(transactionMock).toHaveBeenCalled();
  });

  it("reorder succeeds when all IDs belong to PH's program", async () => {
    poFindManyMock.mockResolvedValue([
      { id: "po-1", order: 0 },
      { id: "po-2", order: 1 },
    ]);

    const result = await reorderPOs(PROGRAM_ID, ["po-2", "po-1"]);

    expect(result).toEqual({ success: true, data: undefined });
    expect(transactionMock).toHaveBeenCalled();
  });

  // ─── Auth guards ─────────────────────────────────────────────────────

  it("rejects unauthenticated requests", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    const result = await createPO({
      programId: PROGRAM_ID,
      code: "PO-1",
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

    const result = await createPO({
      programId: PROGRAM_ID,
      code: "PO-1",
      description: "Test",
    });

    expect(result).toEqual({
      success: false,
      error: "Program Head authentication is required.",
    });
  });
});
