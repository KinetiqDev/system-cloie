import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  session: vi.fn(),
  common: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  po: { updateMany: vi.fn(), findUnique: vi.fn() },
  audit: { create: vi.fn() },
  program: { findMany: vi.fn() },
  transaction: vi.fn(),
}));
vi.mock("@/features/auth/services/resolve-auth-session", () => ({ resolveAuthSession: m.session }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    commonProgramOutcome: m.common,
    pO: m.po,
    outcomeChange: m.audit,
    program: m.program,
    $transaction: m.transaction,
  },
}));
vi.mock("@/lib/utils/confirmation-secret", () => ({ getConfirmationSecret: () => "test-secret" }));

const record = {
  id: "common-1",
  code: "COMMON-1",
  description: "Original statement",
  order: 0,
  is_active: true,
  source_ref: null,
  _count: { program_pos: 2, ge_mappings: 3 },
};

describe("central Common PO ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.common.findUnique.mockResolvedValue(record);
    m.common.update.mockImplementation(({ data }) => Promise.resolve({ ...record, ...data }));
    m.transaction.mockImplementation((callback) =>
      callback({ commonProgramOutcome: m.common, pO: m.po, outcomeChange: m.audit })
    );
  });

  it.each(["SECRETARY", "DEAN"])(
    "allows %s to review and synchronize a central correction atomically",
    async (activeRole) => {
      m.session.mockResolvedValue({ userId: "editor", activeRole });
      const { prepareOutcomeWrite, commitOutcomeWrite } =
        await import("@/features/outcomes/services/manage-outcome-writes");
      const review = await prepareOutcomeWrite({
        kind: "COMMON_PO",
        action: "update",
        id: record.id,
        code: record.code,
        description: "Corrected shared statement",
      });
      expect(review.success).toBe(true);
      if (!review.success) throw new Error(review.error);
      expect(review.data.before).toMatchObject({ _count: { program_pos: 2, ge_mappings: 3 } });
      expect(await commitOutcomeWrite(review.data, true)).toEqual({
        success: true,
        data: { id: record.id },
      });
      expect(m.po.updateMany).toHaveBeenCalledWith({
        where: { common_outcome_id: record.id },
        data: { description: "Corrected shared statement" },
      });
      expect(m.audit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ actor_id: "editor" }),
      });
    }
  );

  it.each(["PROGRAM_HEAD", "FACULTY", "GEN_ED_COORDINATOR", "STUDENT"])(
    "denies %s central writes before reading the catalog",
    async (activeRole) => {
      m.session.mockResolvedValue({ userId: "other", activeRole });
      const { prepareOutcomeWrite } =
        await import("@/features/outcomes/services/manage-outcome-writes");
      expect(
        await prepareOutcomeWrite({ kind: "COMMON_PO", action: "archive", id: record.id })
      ).toMatchObject({ success: false });
      expect(m.common.findUnique).not.toHaveBeenCalled();
    }
  );

  it("lists legacy UNCLASSIFIED program POs for claiming in the central read", async () => {
    m.session.mockResolvedValue({ userId: "editor", activeRole: "DEAN" });
    const { readCentralOutcomeAdministration } =
      await import("@/features/outcomes/services/manage-central-outcomes");
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.program.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.commonProgramOutcome.findMany).mockResolvedValue([] as never);
    await readCentralOutcomeAdministration();
    expect(vi.mocked(prisma.program.findMany).mock.calls[0]?.[0]).toMatchObject({
      select: expect.objectContaining({
        pos: expect.objectContaining({
          where: {
            classification: { in: ["COMMON", "INSTITUTION_SPECIFIC", "UNCLASSIFIED"] },
          },
        }),
      }),
    });
  });

  it("rejects a central correction after another editor changes the statement", async () => {
    m.session.mockResolvedValue({ userId: "editor", activeRole: "DEAN" });
    const { prepareOutcomeWrite, commitOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    const review = await prepareOutcomeWrite({
      kind: "COMMON_PO",
      action: "update",
      id: record.id,
      code: record.code,
      description: "My correction",
    });
    if (!review.success) throw new Error(review.error);
    m.common.findUnique.mockResolvedValue({ ...record, description: "Someone else's correction" });
    expect(await commitOutcomeWrite(review.data, true)).toMatchObject({
      success: false,
      error: "Outcome changed after review. Prepare a new review.",
    });
    expect(m.common.update).not.toHaveBeenCalled();
  });

  it("does not cascade a central archive into local program POs", async () => {
    m.session.mockResolvedValue({ userId: "editor", activeRole: "SECRETARY" });
    const { prepareOutcomeWrite, commitOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    const review = await prepareOutcomeWrite({
      kind: "COMMON_PO",
      action: "archive",
      id: record.id,
    });
    if (!review.success) throw new Error(review.error);
    expect((await commitOutcomeWrite(review.data, true)).success).toBe(true);
    expect(m.po.updateMany).not.toHaveBeenCalled();
  });
});
