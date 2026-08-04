import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { createPrismaUniqueConstraintError } from "@/__tests__/helpers/prisma-test-helpers";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  go: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  cilo: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  mapping: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
  assignment: { findFirst: vi.fn() },
  ph: { findFirst: vi.fn() },
  selectedContext: vi.fn(),
  revalidateAssignment: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: mocks.session,
}));
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: mocks.selectedContext,
  revalidateProgramHeadAssignment: mocks.revalidateAssignment,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    gO: mocks.go,
    cILO: mocks.cilo,
    cILOMapping: mocks.mapping,
    courseAssignment: mocks.assignment,
    programHeadAssignment: mocks.ph,
    $transaction: mocks.transaction,
  },
}));

const SECRETARY = { userId: "secretary", activeRole: ROLES.SECRETARY, roles: [ROLES.SECRETARY] };
const DEAN = { userId: "dean", activeRole: ROLES.DEAN, roles: [ROLES.DEAN] };
const FACULTY = { userId: "faculty", activeRole: ROLES.FACULTY, roles: [ROLES.FACULTY] };

describe("manage-outcome-writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue(SECRETARY);
    mocks.selectedContext.mockResolvedValue({
      success: true,
      data: {
        userId: "program-head",
        authorizedPrograms: [{ id: "program-1", code: "BSED", name: "Secondary Education" }],
        selectedProgram: { id: "program-1", code: "BSED", name: "Secondary Education" },
      },
    });
    mocks.revalidateAssignment.mockResolvedValue({
      id: "program-1",
      code: "BSED",
      name: "Secondary Education",
    });
    mocks.ph.findFirst.mockResolvedValue({ id: "assignment-1" });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        gO: mocks.go,
        cILO: mocks.cilo,
        cILOMapping: mocks.mapping,
        courseAssignment: mocks.assignment,
        programHeadAssignment: mocks.ph,
      })
    );
    mocks.go.findUnique.mockResolvedValue({
      id: "go-1",
      code: "GO-1",
      description: "Old",
      order: 0,
      program_id: "program-1",
      is_active: true,
    });
  });

  it("returns exact before/after review and commits only after confirmation", async () => {
    const { prepareOutcomeWrite, commitOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    const review = await prepareOutcomeWrite({
      kind: "GO",
      action: "update",
      programId: "program-1",
      id: "go-1",
      code: "go-2",
      description: "New",
    });

    expect(review).toEqual({
      success: true,
      data: expect.objectContaining({
        before: {
          id: "go-1",
          code: "GO-1",
          description: "Old",
          order: 0,
          program_id: "program-1",
          is_active: true,
        },
        after: {
          id: "go-1",
          code: "GO-2",
          description: "New",
          order: 0,
          program_id: "program-1",
          is_active: true,
        },
      }),
    });
    expect(await commitOutcomeWrite(review.success ? review.data : fail("review"), false)).toEqual({
      success: false,
      error: "Explicit confirmation is required.",
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects Dean without reading or mutating", async () => {
    mocks.session.mockResolvedValue(DEAN);
    const { prepareOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    expect(
      await prepareOutcomeWrite({
        kind: "GO",
        action: "update",
        programId: "program-1",
        id: "go-1",
        code: "GO-2",
        description: "New",
      })
    ).toEqual({ success: false, error: "You do not have permission to modify this outcome." });
    expect(mocks.go.findUnique).not.toHaveBeenCalled();
  });

  it("rejects stale confirmation and preserves database write", async () => {
    const { prepareOutcomeWrite, commitOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    const review = await prepareOutcomeWrite({
      kind: "GO",
      action: "update",
      programId: "program-1",
      id: "go-1",
      code: "GO-2",
      description: "New",
    });
    mocks.go.findUnique.mockResolvedValue({
      id: "go-1",
      code: "GO-CHANGED",
      description: "Changed",
      order: 0,
      program_id: "program-1",
      is_active: true,
    });
    expect(await commitOutcomeWrite(review.success ? review.data : fail("review"), true)).toEqual({
      success: false,
      error: "Outcome changed after review. Prepare a new review.",
    });
    expect(mocks.go.update).not.toHaveBeenCalled();
  });

  it("translates duplicate mapping race", async () => {
    mocks.cilo.findUnique.mockResolvedValue({
      is_active: true,
      course: { is_active: true, course_scope: "GENERAL_EDUCATION", program_id: null },
    });
    mocks.mapping.findUnique.mockResolvedValue(null);
    mocks.mapping.create.mockRejectedValue(createPrismaUniqueConstraintError());
    const { prepareOutcomeWrite, commitOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    const review = await prepareOutcomeWrite({
      kind: "MAPPING",
      action: "create",
      programId: "program-1",
      ciloId: "cilo-1",
      goId: "go-1",
    });
    expect(review.success).toBe(true);
    expect(await commitOutcomeWrite(review.success ? review.data : fail("review"), true)).toEqual({
      success: false,
      error: "CILO-to-GO mapping already exists.",
    });
  });

  it("requires an active selected-Program assignment for General Education mapping writes", async () => {
    const PROGRAM_HEAD = {
      userId: "program-head",
      activeRole: ROLES.PROGRAM_HEAD,
      roles: [ROLES.PROGRAM_HEAD],
    };
    mocks.session.mockResolvedValue(PROGRAM_HEAD);
    mocks.cilo.findUnique.mockResolvedValue({
      is_active: true,
      course_id: "course-ge",
      course: {
        is_active: true,
        course_scope: "GENERAL_EDUCATION",
        program_id: null,
        course_assignments: [],
      },
    });
    mocks.go.findUnique.mockResolvedValue({ is_active: true, program_id: "program-1" });
    mocks.mapping.findUnique.mockResolvedValue(null);
    mocks.ph.findFirst.mockResolvedValue(null);

    const { prepareOutcomeWrite, commitOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    const review = await prepareOutcomeWrite({
      kind: "MAPPING",
      action: "create",
      programId: "program-1",
      ciloId: "cilo-ge",
      goId: "go-1",
    });

    expect(review).toEqual({
      success: false,
      error: "You do not have permission to modify this outcome.",
    });
    expect(mocks.mapping.create).not.toHaveBeenCalled();
    mocks.ph.findFirst.mockResolvedValue({ id: "assignment-1" });
    mocks.cilo.findUnique.mockResolvedValue({
      is_active: true,
      course_id: "course-ge",
      course: {
        is_active: true,
        course_scope: "GENERAL_EDUCATION",
        program_id: null,
        course_assignments: [{ id: "assignment-1" }],
      },
    });
    mocks.revalidateAssignment.mockResolvedValue({
      id: "program-1",
      code: "BSED",
      name: "Secondary Education",
    });
    mocks.mapping.findUnique.mockResolvedValue(null);
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        gO: mocks.go,
        cILO: mocks.cilo,
        cILOMapping: mocks.mapping,
        courseAssignment: mocks.assignment,
        programHeadAssignment: mocks.ph,
        course: { findUnique: vi.fn() },
      })
    );
    mocks.assignment.findFirst.mockResolvedValue({ id: "assignment-1" });
    mocks.mapping.create.mockResolvedValue({ id: "mapping-1" });
    const allowedReview = await prepareOutcomeWrite({
      kind: "MAPPING",
      action: "create",
      programId: "program-1",
      ciloId: "cilo-ge",
      goId: "go-1",
    });

    expect(allowedReview.success).toBe(true);
    expect(
      await commitOutcomeWrite(allowedReview.success ? allowedReview.data : fail("review"), true)
    ).toEqual({
      success: true,
      data: { id: "mapping-1" },
    });
  });

  it("rejects a Program-specific mapping whose GO is outside the selected Program", async () => {
    const PROGRAM_HEAD = {
      userId: "program-head",
      activeRole: ROLES.PROGRAM_HEAD,
      roles: [ROLES.PROGRAM_HEAD],
    };
    mocks.session.mockResolvedValue(PROGRAM_HEAD);
    mocks.cilo.findUnique.mockResolvedValue({
      is_active: true,
      course_id: "course-bsed",
      course: {
        is_active: true,
        course_scope: "PROGRAM_SPECIFIC",
        program_id: "program-1",
        course_assignments: [],
      },
    });
    mocks.go.findUnique.mockResolvedValue({ is_active: true, program_id: "program-2" });
    mocks.mapping.findUnique.mockResolvedValue(null);

    const { prepareOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    await expect(
      prepareOutcomeWrite({
        kind: "MAPPING",
        action: "create",
        programId: "program-1",
        ciloId: "cilo-1",
        goId: "go-beed",
      })
    ).resolves.toEqual({
      success: false,
      error: "You do not have permission to modify this outcome.",
    });
    expect(mocks.mapping.create).not.toHaveBeenCalled();
  });

  it("rejects a mapping commit after the selected assignment is revoked", async () => {
    const PROGRAM_HEAD = {
      userId: "program-head",
      activeRole: ROLES.PROGRAM_HEAD,
      roles: [ROLES.PROGRAM_HEAD],
    };
    mocks.session.mockResolvedValue(PROGRAM_HEAD);
    mocks.cilo.findUnique.mockResolvedValue({
      is_active: true,
      course_id: "course-ge",
      course: {
        is_active: true,
        course_scope: "GENERAL_EDUCATION",
        program_id: null,
        course_assignments: [{ id: "assignment-1" }],
      },
    });
    mocks.go.findUnique.mockResolvedValue({ is_active: true, program_id: "program-1" });
    mocks.mapping.findUnique.mockResolvedValue(null);
    const { prepareOutcomeWrite, commitOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    const review = await prepareOutcomeWrite({
      kind: "MAPPING",
      action: "create",
      programId: "program-1",
      ciloId: "cilo-ge",
      goId: "go-1",
    });
    if (!review.success) throw new Error(review.error);
    mocks.revalidateAssignment.mockResolvedValue(null);

    await expect(commitOutcomeWrite(review.data, true)).resolves.toEqual({
      success: false,
      error: "You do not have permission to modify this outcome.",
    });
    expect(mocks.mapping.create).not.toHaveBeenCalled();
  });

  it("rejects removing a Program-specific mapping whose CILO belongs to another Program", async () => {
    const PROGRAM_HEAD = {
      userId: "program-head",
      activeRole: ROLES.PROGRAM_HEAD,
      roles: [ROLES.PROGRAM_HEAD],
    };
    mocks.session.mockResolvedValue(PROGRAM_HEAD);
    mocks.mapping.findUnique.mockResolvedValue({
      id: "mapping-1",
      cilo_id: "cilo-beed",
      go_id: "go-bsed",
      cilo: {
        course_id: "course-beed",
        course: {
          course_scope: "PROGRAM_SPECIFIC",
          program_id: "program-2",
          course_assignments: [],
        },
      },
      go: { program_id: "program-1" },
    });

    const { prepareOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    await expect(
      prepareOutcomeWrite({
        kind: "MAPPING",
        action: "remove",
        programId: "program-1",
        id: "mapping-1",
      })
    ).resolves.toEqual({
      success: false,
      error: "You do not have permission to modify this outcome.",
    });
    expect(mocks.mapping.delete).not.toHaveBeenCalled();
  });

  it("rejects forged review payload before opening a transaction", async () => {
    const { prepareOutcomeWrite, commitOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    const review = await prepareOutcomeWrite({
      kind: "GO",
      action: "update",
      programId: "program-1",
      id: "go-1",
      code: "GO-2",
      description: "New",
    });
    if (!review.success) throw new Error(review.error);

    expect(
      await commitOutcomeWrite(
        {
          ...review.data,
          input: {
            kind: "GO",
            action: "update",
            programId: "program-1",
            id: "go-1",
            code: "GO-2",
            description: "Forged",
          },
        },
        true
      )
    ).toEqual({
      success: false,
      error: "You do not have permission to modify this outcome.",
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects partial GO reorder without changing an order", async () => {
    mocks.go.findMany.mockResolvedValue([
      { id: "go-1", order: 0 },
      { id: "go-2", order: 1 },
    ]);
    const { prepareOutcomeWrite, commitOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    const review = await prepareOutcomeWrite({
      kind: "GO",
      action: "reorder",
      programId: "program-1",
      orderedIds: ["go-1"],
    });
    if (!review.success) throw new Error(review.error);

    expect(await commitOutcomeWrite(review.data, true)).toEqual({
      success: false,
      error: "Graduate Outcomes must be a complete unique program order.",
    });
    expect(mocks.go.update).not.toHaveBeenCalled();
  });

  it("requires Faculty active assignment-period scope", async () => {
    mocks.session.mockResolvedValue(FACULTY);
    mocks.cilo.findUnique.mockResolvedValue({ course_id: "course-1" });
    mocks.assignment.findFirst.mockResolvedValue(null);
    const { prepareOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");

    expect(await prepareOutcomeWrite({ kind: "CILO", action: "archive", id: "cilo-1" })).toEqual({
      success: false,
      error: "You do not have permission to modify this outcome.",
    });
    expect(mocks.assignment.findFirst).toHaveBeenCalledWith({
      where: {
        faculty_id: "faculty",
        course_id: "course-1",
        is_active: true,
        term_instance: { status: "ACTIVE" },
      },
    });
  });

  it("rechecks Program Head authority inside transaction", async () => {
    const PROGRAM_HEAD = {
      userId: "program-head",
      activeRole: ROLES.PROGRAM_HEAD,
      roles: [ROLES.PROGRAM_HEAD],
    };
    mocks.session.mockResolvedValue(PROGRAM_HEAD);
    mocks.revalidateAssignment.mockResolvedValueOnce(null);
    const { prepareOutcomeWrite, commitOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    const review = await prepareOutcomeWrite({
      kind: "GO",
      action: "update",
      programId: "program-1",
      id: "go-1",
      code: "GO-2",
      description: "New",
    });
    if (!review.success) throw new Error(review.error);

    expect(await commitOutcomeWrite(review.data, true)).toEqual({
      success: false,
      error: "You do not have permission to modify this outcome.",
    });
    expect(mocks.go.update).not.toHaveBeenCalled();
  });

  it("rolls back a failed GO reorder", async () => {
    const persisted = [
      { id: "go-1", order: 0 },
      { id: "go-2", order: 1 },
    ];
    mocks.go.findMany.mockResolvedValue(persisted);
    mocks.transaction.mockImplementation(async (callback) => {
      const staged = persisted.map((go) => ({ ...go }));
      let calls = 0;
      const tx = {
        gO: {
          findMany: vi.fn().mockResolvedValue(staged),
          update: vi.fn(async ({ where, data }) => {
            calls += 1;
            if (calls === 2) throw new Error("write failed");
            staged.find((go) => go.id === where.id)!.order = data.order;
          }),
        },
      };
      await callback(tx);
      persisted.splice(0, persisted.length, ...staged);
    });
    const { prepareOutcomeWrite, commitOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    const review = await prepareOutcomeWrite({
      kind: "GO",
      action: "reorder",
      programId: "program-1",
      orderedIds: ["go-2", "go-1"],
    });
    if (!review.success) throw new Error(review.error);

    await expect(commitOutcomeWrite(review.data, true)).rejects.toThrow("write failed");
    expect(persisted).toEqual([
      { id: "go-1", order: 0 },
      { id: "go-2", order: 1 },
    ]);
  });
});

function fail(message: string): never {
  throw new Error(message);
}
