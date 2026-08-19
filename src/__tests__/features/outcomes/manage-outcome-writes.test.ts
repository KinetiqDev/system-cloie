import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  plo: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  cilo: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  institutionalOutcome: { findUnique: vi.fn(), findMany: vi.fn() },
  assignment: { findFirst: vi.fn() },
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
    pLO: mocks.plo,
    cILO: mocks.cilo,
    institutionalOutcome: mocks.institutionalOutcome,
    courseAssignment: mocks.assignment,
    $transaction: mocks.transaction,
  },
}));

const COMPLETE_PROFILE_GATE = { status: "COMPLETE" as const };
const PROGRAM_HEAD = {
  userId: "program-head",
  activeRole: ROLES.PROGRAM_HEAD,
  roles: [ROLES.PROGRAM_HEAD],
  profileGate: COMPLETE_PROFILE_GATE,
};
const SECRETARY = {
  userId: "secretary",
  activeRole: ROLES.SECRETARY,
  roles: [ROLES.SECRETARY],
  profileGate: COMPLETE_PROFILE_GATE,
};
const DEAN = {
  userId: "dean",
  activeRole: ROLES.DEAN,
  roles: [ROLES.DEAN],
  profileGate: COMPLETE_PROFILE_GATE,
};
const FACULTY = {
  userId: "faculty",
  activeRole: ROLES.FACULTY,
  roles: [ROLES.FACULTY],
  profileGate: COMPLETE_PROFILE_GATE,
};

describe("manage-outcome-writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue(PROGRAM_HEAD);
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
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        pLO: mocks.plo,
        cILO: mocks.cilo,
        institutionalOutcome: mocks.institutionalOutcome,
        courseAssignment: mocks.assignment,
      })
    );
    mocks.plo.findUnique.mockResolvedValue({
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
      kind: "PLO",
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
        kind: "PLO",
        action: "update",
        programId: "program-1",
        id: "go-1",
        code: "GO-2",
        description: "New",
      })
    ).toEqual({ success: false, error: "You do not have permission to modify this outcome." });
    expect(mocks.plo.findUnique).not.toHaveBeenCalled();
  });

  it("rejects stale confirmation and preserves database write", async () => {
    const { prepareOutcomeWrite, commitOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    const review = await prepareOutcomeWrite({
      kind: "PLO",
      action: "update",
      programId: "program-1",
      id: "go-1",
      code: "GO-2",
      description: "New",
    });
    mocks.plo.findUnique.mockResolvedValue({
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
    expect(mocks.plo.update).not.toHaveBeenCalled();
  });

  it("rejects forged review payload before opening a transaction", async () => {
    const { prepareOutcomeWrite, commitOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    const review = await prepareOutcomeWrite({
      kind: "PLO",
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
            kind: "PLO",
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
    mocks.plo.findMany.mockResolvedValue([
      { id: "go-1", order: 0 },
      { id: "go-2", order: 1 },
    ]);
    const { prepareOutcomeWrite, commitOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    const review = await prepareOutcomeWrite({
      kind: "PLO",
      action: "reorder",
      programId: "program-1",
      orderedIds: ["go-1"],
    });
    if (!review.success) throw new Error(review.error);

    expect(await commitOutcomeWrite(review.data, true)).toEqual({
      success: false,
      error: "Program Learning Outcomes must be a complete unique program order.",
    });
    expect(mocks.plo.update).not.toHaveBeenCalled();
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
    mocks.revalidateAssignment.mockResolvedValueOnce(null);
    const { prepareOutcomeWrite, commitOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    const review = await prepareOutcomeWrite({
      kind: "PLO",
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
    expect(mocks.plo.update).not.toHaveBeenCalled();
  });

  it("rolls back a failed GO reorder", async () => {
    const persisted = [
      { id: "go-1", order: 0 },
      { id: "go-2", order: 1 },
    ];
    mocks.plo.findMany.mockResolvedValue(persisted);
    mocks.transaction.mockImplementation(async (callback) => {
      const staged = persisted.map((go) => ({ ...go }));
      let calls = 0;
      const tx = {
        pLO: {
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
      kind: "PLO",
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

  it("denies Secretary PLO writes before reading state", async () => {
    mocks.session.mockResolvedValue(SECRETARY);
    const { prepareOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    await expect(
      prepareOutcomeWrite({
        kind: "PLO",
        action: "update",
        programId: "program-1",
        id: "go-1",
        code: "GO-2",
        description: "New",
      })
    ).resolves.toEqual({
      success: false,
      error: "You do not have permission to modify this outcome.",
    });
    expect(mocks.plo.findUnique).not.toHaveBeenCalled();
    expect(mocks.selectedContext).not.toHaveBeenCalled();
  });

  it("denies Secretary CILO writes before reading state", async () => {
    mocks.session.mockResolvedValue(SECRETARY);
    const { prepareOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    await expect(
      prepareOutcomeWrite({ kind: "CILO", action: "archive", id: "cilo-1" })
    ).resolves.toEqual({
      success: false,
      error: "You do not have permission to modify this outcome.",
    });
    expect(mocks.cilo.findUnique).not.toHaveBeenCalled();
  });

  it("denies Secretary Institutional Outcome encodes before reading state", async () => {
    mocks.session.mockResolvedValue(SECRETARY);
    const { prepareOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    await expect(
      prepareOutcomeWrite({
        kind: "ILO",
        action: "create",
        code: "IO-1",
        description: "New",
      })
    ).resolves.toEqual({
      success: false,
      error: "You do not have permission to modify this outcome.",
    });
    expect(mocks.institutionalOutcome.findMany).not.toHaveBeenCalled();
  });
});

function fail(message: string): never {
  throw new Error(message);
}