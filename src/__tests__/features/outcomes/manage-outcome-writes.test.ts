import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { createPrismaUniqueConstraintError } from "@/__tests__/helpers/prisma-test-helpers";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  go: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  cilo: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  mapping: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
  institutionalOutcome: { findUnique: vi.fn() },
  iloMapping: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
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
    institutionalOutcome: mocks.institutionalOutcome,
    cILOInstitutionalOutcomeMapping: mocks.iloMapping,
    courseAssignment: mocks.assignment,
    programHeadAssignment: mocks.ph,
    $transaction: mocks.transaction,
  },
}));

const COMPLETE_PROFILE_GATE = { status: "COMPLETE" as const };
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
        institutionalOutcome: mocks.institutionalOutcome,
        cILOInstitutionalOutcomeMapping: mocks.iloMapping,
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
      course: { is_active: true, course_scope: "PROGRAM_SPECIFIC", program_id: "program-1" },
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

  it("rejects General Education CILO-to-GO writes for every role after the cutover", async () => {
    mocks.cilo.findUnique.mockResolvedValue({
      is_active: true,
      course: { course_scope: "GENERAL_EDUCATION", program_id: null },
    });
    mocks.go.findUnique.mockResolvedValue({ id: "go-1", is_active: true, program_id: "program-1" });
    mocks.mapping.findUnique.mockResolvedValue(null);

    const { prepareOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    await expect(
      prepareOutcomeWrite({
        kind: "MAPPING",
        action: "create",
        programId: "program-1",
        ciloId: "cilo-ge",
        goId: "go-1",
      })
    ).resolves.toEqual({
      success: false,
      error: "General Education CILOs map only to Institutional Outcomes",
    });
    expect(mocks.mapping.create).not.toHaveBeenCalled();
  });

  it("supports Secretary CILO-to-Institutional Outcome writes with actor provenance", async () => {
    mocks.cilo.findUnique.mockResolvedValue({
      is_active: true,
      course: { is_active: true, course_scope: "GENERAL_EDUCATION" },
    });
    mocks.institutionalOutcome.findUnique.mockResolvedValue({ id: "ilo-1", is_active: true });
    mocks.iloMapping.findUnique.mockResolvedValue(null);
    mocks.iloMapping.create.mockResolvedValue({ id: "ilo-mapping-1" });
    const { prepareOutcomeWrite, commitOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    const review = await prepareOutcomeWrite({
      kind: "ILO_MAPPING",
      action: "create",
      ciloId: "cilo-ge",
      iloId: "ilo-1",
    });
    expect(review.success).toBe(true);
    expect(
      await commitOutcomeWrite(review.success ? review.data : fail("review"), true)
    ).toEqual({
      success: true,
      data: { id: "ilo-mapping-1" },
    });
    expect(mocks.iloMapping.create).toHaveBeenCalledWith({
      data: {
        cilo_id: "cilo-ge",
        institutional_outcome_id: "ilo-1",
        created_by: "secretary",
        updated_by: "secretary",
      },
    });
  });

  it("rejects Program-specific CILO-to-Institutional Outcome writes", async () => {
    mocks.cilo.findUnique.mockResolvedValue({
      is_active: true,
      course: { course_scope: "PROGRAM_SPECIFIC" },
    });
    mocks.institutionalOutcome.findUnique.mockResolvedValue({ id: "ilo-1", is_active: true });
    mocks.iloMapping.findUnique.mockResolvedValue(null);

    const { prepareOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    await expect(
      prepareOutcomeWrite({
        kind: "ILO_MAPPING",
        action: "create",
        ciloId: "cilo-1",
        iloId: "ilo-1",
      })
    ).resolves.toEqual({
      success: false,
      error: "Institutional Outcomes map only General Education CILOs",
    });
    expect(mocks.iloMapping.create).not.toHaveBeenCalled();
  });

  it("authorizes Faculty Institutional Outcome writes only for assigned General Education Courses", async () => {
    mocks.session.mockResolvedValue(FACULTY);
    mocks.cilo.findUnique.mockResolvedValue({
      is_active: true,
      course_id: "course-ge",
      course: { is_active: true, course_scope: "GENERAL_EDUCATION" },
    });
    mocks.institutionalOutcome.findUnique.mockResolvedValue({ id: "ilo-1", is_active: true });
    mocks.iloMapping.findUnique.mockResolvedValue(null);
    mocks.assignment.findFirst.mockResolvedValue(null);
    const { prepareOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");

    await expect(
      prepareOutcomeWrite({
        kind: "ILO_MAPPING",
        action: "create",
        ciloId: "cilo-ge",
        iloId: "ilo-1",
      })
    ).resolves.toEqual({
      success: false,
      error: "You do not have permission to modify this outcome.",
    });

    mocks.assignment.findFirst.mockResolvedValue({ id: "assignment-1" });
    await expect(
      prepareOutcomeWrite({
        kind: "ILO_MAPPING",
        action: "create",
        ciloId: "cilo-ge",
        iloId: "ilo-1",
      })
    ).resolves.toMatchObject({ success: true });
  });

  it("denies Program Head Institutional Outcome mapping writes", async () => {
    const PROGRAM_HEAD = {
      userId: "program-head",
      activeRole: ROLES.PROGRAM_HEAD,
      roles: [ROLES.PROGRAM_HEAD],
      profileGate: COMPLETE_PROFILE_GATE,
    };
    mocks.session.mockResolvedValue(PROGRAM_HEAD);
    mocks.cilo.findUnique.mockResolvedValue({
      is_active: true,
      course: { is_active: true, course_scope: "GENERAL_EDUCATION" },
    });
    mocks.institutionalOutcome.findUnique.mockResolvedValue({ id: "ilo-1", is_active: true });
    mocks.iloMapping.findUnique.mockResolvedValue(null);

    const { prepareOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    await expect(
      prepareOutcomeWrite({
        kind: "ILO_MAPPING",
        action: "create",
        ciloId: "cilo-ge",
        iloId: "ilo-1",
      })
    ).resolves.toEqual({
      success: false,
      error: "You do not have permission to modify this outcome.",
    });
    expect(mocks.iloMapping.create).not.toHaveBeenCalled();
  });

  it("denies Program Head Program-specific mapping writes without reading scope state", async () => {
    const PROGRAM_HEAD = {
      userId: "program-head",
      activeRole: ROLES.PROGRAM_HEAD,
      roles: [ROLES.PROGRAM_HEAD],
      profileGate: COMPLETE_PROFILE_GATE,
    };
    mocks.session.mockResolvedValue(PROGRAM_HEAD);
    mocks.go.findUnique.mockResolvedValue({ is_active: true, program_id: "program-1" });
    mocks.mapping.findUnique.mockResolvedValue(null);

    const { prepareOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    await expect(
      prepareOutcomeWrite({
        kind: "MAPPING",
        action: "create",
        programId: "program-1",
        ciloId: "cilo-1",
        goId: "go-1",
      })
    ).resolves.toEqual({
      success: false,
      error: "You do not have permission to modify this outcome.",
    });
    expect(mocks.cilo.findUnique).not.toHaveBeenCalled();
    expect(mocks.mapping.create).not.toHaveBeenCalled();
  });

  it("denies Program Head Program-specific mapping removals without reading scope state", async () => {
    const PROGRAM_HEAD = {
      userId: "program-head",
      activeRole: ROLES.PROGRAM_HEAD,
      roles: [ROLES.PROGRAM_HEAD],
      profileGate: COMPLETE_PROFILE_GATE,
    };
    mocks.session.mockResolvedValue(PROGRAM_HEAD);

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
    expect(mocks.mapping.findUnique).not.toHaveBeenCalled();
    expect(mocks.mapping.delete).not.toHaveBeenCalled();
  });

  it("supports Secretary Program-specific mapping correction with actor provenance", async () => {
    mocks.cilo.findUnique.mockResolvedValue({
      is_active: true,
      course: { is_active: true, course_scope: "PROGRAM_SPECIFIC", program_id: "program-1" },
    });
    mocks.go.findUnique.mockResolvedValue({ id: "go-1", is_active: true, program_id: "program-1" });
    mocks.mapping.findUnique.mockResolvedValue(null);
    mocks.mapping.create.mockResolvedValue({ id: "mapping-1" });
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
    expect(
      await commitOutcomeWrite(review.success ? review.data : fail("review"), true)
    ).toEqual({
      success: true,
      data: { id: "mapping-1" },
    });
    expect(mocks.mapping.create).toHaveBeenCalledWith({
      data: {
        cilo_id: "cilo-1",
        go_id: "go-1",
        created_by: "secretary",
        updated_by: "secretary",
      },
    });
  });

  it("supports Secretary Program-specific mapping removal college-wide", async () => {
    mocks.mapping.findUnique.mockResolvedValue({
      id: "mapping-1",
      cilo_id: "cilo-1",
      go_id: "go-1",
    });
    const { prepareOutcomeWrite, commitOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    const review = await prepareOutcomeWrite({
      kind: "MAPPING",
      action: "remove",
      programId: "program-1",
      id: "mapping-1",
    });
    expect(review.success).toBe(true);
    expect(
      await commitOutcomeWrite(review.success ? review.data : fail("review"), true)
    ).toEqual({ success: true, data: {} });
    expect(mocks.mapping.delete).toHaveBeenCalledWith({ where: { id: "mapping-1" } });
  });

  it("authorizes Faculty Program-specific mapping writes for assigned Courses", async () => {
    mocks.session.mockResolvedValue(FACULTY);
    mocks.cilo.findUnique.mockResolvedValue({
      is_active: true,
      course_id: "course-1",
      course: { is_active: true, course_scope: "PROGRAM_SPECIFIC", program_id: "program-1" },
    });
    mocks.go.findUnique.mockResolvedValue({ is_active: true, program_id: "program-1" });
    mocks.mapping.findUnique.mockResolvedValue(null);
    mocks.assignment.findFirst.mockResolvedValue({ id: "assignment-1" });
    const { prepareOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");

    await expect(
      prepareOutcomeWrite({
        kind: "MAPPING",
        action: "create",
        programId: "program-1",
        ciloId: "cilo-1",
        goId: "go-1",
      })
    ).resolves.toMatchObject({ success: true });
  });

  it("denies unassigned Faculty Program-specific mapping writes", async () => {
    mocks.session.mockResolvedValue(FACULTY);
    mocks.cilo.findUnique.mockResolvedValue({
      is_active: true,
      course_id: "course-1",
      course: { is_active: true, course_scope: "PROGRAM_SPECIFIC", program_id: "program-1" },
    });
    mocks.mapping.findUnique.mockResolvedValue(null);
    mocks.assignment.findFirst.mockResolvedValue(null);
    const { prepareOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");

    await expect(
      prepareOutcomeWrite({
        kind: "MAPPING",
        action: "create",
        programId: "program-1",
        ciloId: "cilo-1",
        goId: "go-1",
      })
    ).resolves.toEqual({
      success: false,
      error: "You do not have permission to modify this outcome.",
    });
    expect(mocks.mapping.create).not.toHaveBeenCalled();
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
      profileGate: COMPLETE_PROFILE_GATE,
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
