import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { createPrismaUniqueConstraintError } from "@/__tests__/helpers/prisma-test-helpers";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  institutionalOutcome: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  transaction: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: mocks.session,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    institutionalOutcome: mocks.institutionalOutcome,
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: vi.fn(),
  revalidateProgramHeadAssignment: vi.fn(),
}));

const SECRETARY = { userId: "secretary-1", activeRole: ROLES.SECRETARY, roles: [ROLES.SECRETARY] };
const DEAN = { userId: "dean-1", activeRole: ROLES.DEAN, roles: [ROLES.DEAN] };
const OUTCOME_ID = "11111111-1111-4111-8111-111111111111";

const activeOutcome = {
  id: OUTCOME_ID,
  code: "ILO-1",
  description: "Reason with evidence.",
  order: 0,
  is_active: true,
};

describe("Institutional Outcome protected writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue(SECRETARY);
    mocks.institutionalOutcome.findMany.mockResolvedValue([activeOutcome]);
    mocks.institutionalOutcome.findUnique.mockResolvedValue(activeOutcome);
    mocks.institutionalOutcome.create.mockResolvedValue({ id: OUTCOME_ID });
    mocks.institutionalOutcome.update.mockResolvedValue({ id: OUTCOME_ID });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({ institutionalOutcome: mocks.institutionalOutcome })
    );
  });

  it("returns an exact review and leaves the catalog unchanged until confirmation", async () => {
    const { prepareOutcomeWrite, commitOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    const review = await prepareOutcomeWrite({
      kind: "ILO",
      action: "update",
      id: OUTCOME_ID,
      code: "ilo-2",
      description: "Reason with better evidence.",
    });

    expect(review).toMatchObject({
      success: true,
      data: {
        before: activeOutcome,
        after: { ...activeOutcome, code: "ILO-2", description: "Reason with better evidence." },
      },
    });
    expect(await commitOutcomeWrite(review.success ? review.data : fail("review"), false)).toEqual({
      success: false,
      error: "Explicit confirmation is required.",
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it.each([
    DEAN,
    { userId: "program-head-1", activeRole: ROLES.PROGRAM_HEAD },
    { userId: "faculty-1", activeRole: ROLES.FACULTY },
  ])("rejects $activeRole before reading mutation state", async (session) => {
    mocks.session.mockResolvedValue(session);
    const { prepareOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");

    await expect(
      prepareOutcomeWrite({
        kind: "ILO",
        action: "archive",
        id: OUTCOME_ID,
      })
    ).resolves.toEqual({
      success: false,
      error: "You do not have permission to modify this outcome.",
    });
    expect(mocks.institutionalOutcome.findUnique).not.toHaveBeenCalled();
    expect(mocks.institutionalOutcome.findMany).not.toHaveBeenCalled();
  });

  it("rejects a stale reviewed update without writing", async () => {
    const { prepareOutcomeWrite, commitOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    const review = await prepareOutcomeWrite({
      kind: "ILO",
      action: "update",
      id: OUTCOME_ID,
      code: "ILO-2",
      description: "Changed statement.",
    });
    mocks.institutionalOutcome.findUnique.mockResolvedValue({
      ...activeOutcome,
      description: "Changed by another Secretary.",
    });

    await expect(
      commitOutcomeWrite(review.success ? review.data : fail("review"), true)
    ).resolves.toEqual({
      success: false,
      error: "Outcome changed after review. Prepare a new review.",
    });
    expect(mocks.institutionalOutcome.update).not.toHaveBeenCalled();
  });

  it("translates a duplicate code race into a safe catalog error", async () => {
    const { prepareOutcomeWrite, commitOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    const review = await prepareOutcomeWrite({
      kind: "ILO",
      action: "create",
      code: "ILO-2",
      description: "Reason with evidence.",
    });
    mocks.transaction.mockRejectedValue(createPrismaUniqueConstraintError());

    await expect(
      commitOutcomeWrite(review.success ? review.data : fail("review"), true)
    ).resolves.toEqual({
      success: false,
      error: "Institutional Outcome code already exists.",
    });
  });
  it("creates an Institutional Outcome after explicit confirmation", async () => {
    const { prepareOutcomeWrite, commitOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    const review = await prepareOutcomeWrite({
      kind: "ILO",
      action: "create",
      code: "ILO-2",
      description: "Communicate clearly.",
    });
    await expect(
      commitOutcomeWrite(review.success ? review.data : fail("review"), true)
    ).resolves.toEqual({ success: true, data: { id: OUTCOME_ID } });
    expect(mocks.institutionalOutcome.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ order: 1 }) })
    );
  });

  it("archives and restores an Institutional Outcome through the atomic gateway", async () => {
    const { prepareOutcomeWrite, commitOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    const archiveReview = await prepareOutcomeWrite({
      kind: "ILO",
      action: "archive",
      id: OUTCOME_ID,
    });
    await expect(
      commitOutcomeWrite(archiveReview.success ? archiveReview.data : fail("archive review"), true)
    ).resolves.toEqual({ success: true, data: { id: OUTCOME_ID } });
    const restoreReview = await prepareOutcomeWrite({
      kind: "ILO",
      action: "restore",
      id: OUTCOME_ID,
    });
    await expect(
      commitOutcomeWrite(restoreReview.success ? restoreReview.data : fail("restore review"), true)
    ).resolves.toEqual({ success: true, data: { id: OUTCOME_ID } });
    expect(mocks.institutionalOutcome.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { is_active: true } })
    );
  });

  it("reorders every catalog row atomically and rejects incomplete orders", async () => {
    const { prepareOutcomeWrite, commitOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");
    mocks.institutionalOutcome.findMany.mockResolvedValue([
      { ...activeOutcome, order: 0 },
      { ...activeOutcome, id: "22222222-2222-4222-8222-222222222222", code: "ILO-2", order: 1 },
    ]);
    const review = await prepareOutcomeWrite({
      kind: "ILO",
      action: "reorder",
      orderedIds: ["22222222-2222-4222-8222-222222222222", OUTCOME_ID],
    });
    await expect(
      commitOutcomeWrite(review.success ? review.data : fail("reorder review"), true)
    ).resolves.toEqual({ success: true, data: {} });
    expect(mocks.institutionalOutcome.update).toHaveBeenCalledTimes(2);
  });
});

function fail(message: string): never {
  throw new Error(message);
}
