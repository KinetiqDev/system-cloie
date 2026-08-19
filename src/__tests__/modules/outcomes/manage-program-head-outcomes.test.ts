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
    pLO: {
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
const PLO_ID = "go-1";

describe("manage-program-head-outcomes", () => {
  let listProgramPLOs: typeof import("@/features/outcomes/services/manage-program-head-outcomes").listProgramPLOs;
  let createPLO: typeof import("@/features/outcomes/services/manage-program-head-outcomes").createPLO;
  let updatePLO: typeof import("@/features/outcomes/services/manage-program-head-outcomes").updatePLO;
  let deletePLO: typeof import("@/features/outcomes/services/manage-program-head-outcomes").deletePLO;
  let reorderPLOs: typeof import("@/features/outcomes/services/manage-program-head-outcomes").reorderPLOs;
  let restorePLO: typeof import("@/features/outcomes/services/manage-program-head-outcomes").restorePLO;
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
        pLO: {
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
    listProgramPLOs = mod.listProgramPLOs;
    createPLO = mod.createPLO;
    updatePLO = mod.updatePLO;
    deletePLO = mod.deletePLO;
    reorderPLOs = mod.reorderPLOs;
    restorePLO = mod.restorePLO;
    listCILOMappingsForProgram = mod.listCILOMappingsForProgram;
  });

  // ─── listProgramPLOs ──────────────────────────────────────────────────

  it("PH can list GOs for assigned program", async () => {
    programFindUniqueMock.mockResolvedValue({
      id: PROGRAM_ID,
      code: "BSIT",
      name: "BS Information Technology",
    });
    goFindManyMock.mockResolvedValue([
      {
        id: PLO_ID,
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

    const result = await listProgramPLOs(PROGRAM_ID);

    expect(result).toEqual({
      success: true,
      data: {
        plos: expect.arrayContaining([
          expect.objectContaining({
            id: PLO_ID,
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

    const result = await listProgramPLOs(selectedProgramId);

    expect(result).toEqual({
      success: true,
      data: {
        plos: [],
        program: { id: selectedProgramId, code: "BSED", name: "Secondary Education" },
      },
    });
    expect(goFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { program_id: selectedProgramId } })
    );
  });

  it("includes assigned General Education courses with Institutional Outcome mappings", async () => {
    const selectedProgramId = "program-2";
    programHeadAssignmentFindManyMock.mockResolvedValue([{ program_id: selectedProgramId }]);
    courseFindManyMock.mockResolvedValue([
      {
        id: "course-ge",
        code: "GE101",
        title: "General Education",
        course_scope: "GENERAL_EDUCATION",
        cilos: [
          {
            id: "cilo-ge",
            description: "Communicate effectively",
            cilo_mappings: [],
            cilo_institutional_outcome_mappings: [
              {
                id: "ilo-mapping-1",
                institutional_outcome: {
                  id: "ilo-1",
                  code: "ILO-1",
                  description: "Communicate clearly",
                  is_active: true,
                },
              },
            ],
          },
        ],
      },
    ]);

    const result = await listCILOMappingsForProgram(selectedProgramId);

    expect(result).toEqual({
      success: true,
      data: [
        {
          courseId: "course-ge",
          courseCode: "GE101",
          courseTitle: "General Education",
          courseScope: "GENERAL_EDUCATION",
          cilos: [
            {
              id: "cilo-ge",
              description: "Communicate effectively",
              mappedTargets: [
                {
                  mappingId: "ilo-mapping-1",
                  id: "ilo-1",
                  code: "ILO-1",
                  description: "Communicate clearly",
                  kind: "ILO",
                  is_active: true,
                },
              ],
              readiness: "ready",
            },
          ],
        },
      ],
    });
    expect(courseFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              course_scope: "GENERAL_EDUCATION",
              course_assignments: {
                some: {
                  program_id: selectedProgramId,
                  is_active: true,
                  term_instance: { status: "ACTIVE" },
                },
              },
            }),
          ]),
        }),
      })
    );
  });

  it("reports Program-specific GO mappings and readiness gaps per CILO", async () => {
    const selectedProgramId = "program-1";
    programHeadAssignmentFindManyMock.mockResolvedValue([{ program_id: selectedProgramId }]);
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
                plo: { id: "go-1", code: "GO-1", description: "Design", is_active: true },
              },
            ],
            cilo_institutional_outcome_mappings: [],
          },
          {
            id: "cilo-archived",
            description: "Retired outcome",
            cilo_mappings: [
              {
                id: "mapping-2",
                plo: { id: "go-2", code: "GO-2", description: "Legacy", is_active: false },
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
          OR: expect.arrayContaining([
            expect.objectContaining({
              program_id: selectedProgramId,
              course_assignments: {
                some: {
                  program_id: selectedProgramId,
                  is_active: true,
                  term_instance: { status: "ACTIVE" },
                },
              },
            }),
          ]),
        }),
      })
    );
    expect(result.data[0]).toMatchObject({
      courseScope: "PROGRAM_SPECIFIC",
      cilos: [
        { id: "cilo-aligned", readiness: "ready" },
        { id: "cilo-archived", readiness: "incomplete-mapping" },
        { id: "cilo-gap", readiness: "incomplete-mapping" },
      ],
    });
    expect(result.data[0].cilos[1].mappedTargets).toEqual([
      {
        id: "go-2",
        mappingId: "mapping-2",
        code: "GO-2",
        description: "Legacy",
        kind: "PLO",
        is_active: false,
      },
    ]);
    expect(result.data[0].cilos[2].mappedTargets).toEqual([]);
  });

  // ─── createPLO ────────────────────────────────────────────────────────

  it("PH can create a GO within assigned program", async () => {
    goFindManyMock.mockResolvedValue([]);
    programFindUniqueMock.mockResolvedValue({ is_active: true });
    goCreateMock.mockResolvedValue({ id: PLO_ID });

    const result = await createPLO({
      programId: PROGRAM_ID,
      code: "GO-1",
      description: "Critical Thinking",
    });

    expect(result).toEqual({ success: true, data: { id: PLO_ID } });
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

    const result = await createPLO({
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

    const result = await createPLO({
      programId: PROGRAM_ID,
      code: "GO-1",
      description: "Duplicate GO",
    });

    expect(result).toEqual({
      success: false,
      error: "Program Learning Outcome code already exists.",
    });
  });

  // ─── updatePLO ────────────────────────────────────────────────────────

  it("PH can update a GO within scope", async () => {
    goFindUniqueMock.mockResolvedValue({
      id: PLO_ID,
      code: "GO-1",
      description: "Original",
      order: 0,
      is_active: true,
      program_id: PROGRAM_ID,
    });
    goUpdateMock.mockResolvedValue({ id: PLO_ID });

    const result = await updatePLO({
      programId: PROGRAM_ID,
      id: PLO_ID,
      code: "GO-1-UPDATED",
      description: "Updated description",
    });

    expect(result).toEqual({ success: true, data: { id: PLO_ID } });
    expect(goUpdateMock).toHaveBeenCalledWith({
      where: { id: PLO_ID },
      data: {
        code: "GO-1-UPDATED",
        description: "Updated description",
      },
    });
  });

  it("PH cannot update GO outside scope", async () => {
    goFindUniqueMock.mockResolvedValue({
      id: PLO_ID,
      program_id: "other-program",
    });

    const result = await updatePLO({
      programId: PROGRAM_ID,
      id: PLO_ID,
      code: "GO-1",
      description: "Attempt update",
    });

    expect(result).toEqual({
      success: false,
      error: "You do not have permission to modify this Program Learning Outcome.",
    });
    expect(goUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects a BEED GO from a selected BSED context", async () => {
    const selectedProgramId = "program-2";
    programHeadAssignmentFindManyMock.mockResolvedValue([
      { program_id: PROGRAM_ID },
      { program_id: selectedProgramId },
    ]);
    goFindUniqueMock.mockResolvedValue({ id: PLO_ID, program_id: PROGRAM_ID });

    const result = await updatePLO({
      programId: selectedProgramId,
      id: PLO_ID,
      code: "GO-1",
      description: "Attempt update",
    });

    expect(result).toEqual({
      success: false,
      error: "You do not have permission to modify this Program Learning Outcome.",
    });
    expect(goUpdateMock).not.toHaveBeenCalled();
  });

  // ─── deletePLO ────────────────────────────────────────────────────────

  it("PH archives GO without deleting mappings", async () => {
    goFindUniqueMock.mockResolvedValue({
      id: PLO_ID,
      program_id: PROGRAM_ID,
      code: "GO-1",
      description: "Original",
      order: 0,
      is_active: true,
    });
    goUpdateMock.mockResolvedValue({ id: PLO_ID });

    const result = await deletePLO(PROGRAM_ID, PLO_ID);

    expect(result).toEqual({ success: true, data: undefined });
    expect(goUpdateMock).toHaveBeenCalledWith({ where: { id: PLO_ID }, data: { is_active: false } });
  });

  it("PH archives GO with existing CILO mappings", async () => {
    goFindUniqueMock.mockResolvedValue({
      id: PLO_ID,
      program_id: PROGRAM_ID,
      code: "GO-1",
      description: "Original",
      order: 0,
      is_active: true,
    });
    goUpdateMock.mockResolvedValue({ id: PLO_ID });

    const result = await deletePLO(PROGRAM_ID, PLO_ID);

    expect(result).toEqual({ success: true, data: undefined });
    expect(goUpdateMock).toHaveBeenCalledWith({ where: { id: PLO_ID }, data: { is_active: false } });
  });

  // ─── restorePLO ───────────────────────────────────────────────────────

  it("PH restores an archived GO within the assigned program", async () => {
    goFindUniqueMock.mockResolvedValue({
      id: PLO_ID,
      program_id: PROGRAM_ID,
      code: "GO-1",
      description: "Original",
      order: 0,
      is_active: false,
    });
    goUpdateMock.mockResolvedValue({ id: PLO_ID });

    const result = await restorePLO(PROGRAM_ID, PLO_ID);

    expect(result).toEqual({ success: true, data: undefined });
    expect(goUpdateMock).toHaveBeenCalledWith({ where: { id: PLO_ID }, data: { is_active: true } });
  });

  it("PH cannot restore a GO outside the assigned program", async () => {
    goFindUniqueMock.mockResolvedValue({ id: PLO_ID, program_id: "other-program" });

    const result = await restorePLO(PROGRAM_ID, PLO_ID);

    expect(result).toEqual({
      success: false,
      error: "You do not have permission to restore this Program Learning Outcome.",
    });
    expect(goUpdateMock).not.toHaveBeenCalled();
  });

  it("restorePLO fails safely when the GO does not exist", async () => {
    goFindUniqueMock.mockResolvedValue(null);

    const result = await restorePLO(PROGRAM_ID, PLO_ID);

    expect(result).toEqual({ success: false, error: "Program Learning Outcome not found." });
    expect(goUpdateMock).not.toHaveBeenCalled();
  });

  // ─── reorderPLOs ──────────────────────────────────────────────────────

  it("reorder validates all IDs belong to PH's program", async () => {
    goFindManyMock.mockResolvedValue([{ id: "go-1", order: 0 }]);

    const result = await reorderPLOs(PROGRAM_ID, ["go-1", "go-2"]);

    expect(result).toEqual({
      success: false,
      error: "Program Learning Outcomes must be a complete unique program order.",
    });
    expect(transactionMock).toHaveBeenCalled();
  });

  it("reorder succeeds when all IDs belong to PH's program", async () => {
    goFindManyMock.mockResolvedValue([
      { id: "go-1", order: 0 },
      { id: "go-2", order: 1 },
    ]);

    const result = await reorderPLOs(PROGRAM_ID, ["go-2", "go-1"]);

    expect(result).toEqual({ success: true, data: undefined });
    expect(transactionMock).toHaveBeenCalled();
  });

  // ─── Auth guards ─────────────────────────────────────────────────────

  it("rejects unauthenticated requests", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    const result = await createPLO({
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

    const result = await createPLO({
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
