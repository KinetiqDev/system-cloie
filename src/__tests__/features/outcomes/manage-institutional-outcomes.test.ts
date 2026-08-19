import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import type { OutcomeWriteInput } from "@/features/outcomes/services/manage-outcome-writes";

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

const COMPLETE_PROFILE_GATE = { status: "COMPLETE" as const };
const SECRETARY = {
  userId: "secretary-1",
  activeRole: ROLES.SECRETARY,
  roles: [ROLES.SECRETARY],
  profileGate: COMPLETE_PROFILE_GATE,
};
const DEAN = {
  userId: "dean-1",
  activeRole: ROLES.DEAN,
  roles: [ROLES.DEAN],
  profileGate: COMPLETE_PROFILE_GATE,
};
const OUTCOME_ID = "11111111-1111-4111-8111-111111111111";

const activeOutcome = {
  id: OUTCOME_ID,
  code: "ILO-1",
  description: "Reason with evidence.",
  order: 0,
  is_active: true,
  updated_at: new Date("2026-08-14T00:00:00Z"),
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

  const deniedWrites: OutcomeWriteInput[] = [
    { kind: "ILO", action: "create", code: "ILO-2", description: "Communicate clearly." },
    { kind: "ILO", action: "update", id: OUTCOME_ID, code: "ILO-2", description: "Changed." },
    { kind: "ILO", action: "archive", id: OUTCOME_ID },
    { kind: "ILO", action: "restore", id: OUTCOME_ID },
    { kind: "ILO", action: "reorder", orderedIds: [OUTCOME_ID] },
  ];

  it.each(deniedWrites)("denies Secretary $action encodes before reading catalog state", async (input) => {
    const { prepareOutcomeWrite } =
      await import("@/features/outcomes/services/manage-outcome-writes");

    await expect(prepareOutcomeWrite(input)).resolves.toEqual({
      success: false,
      error: "You do not have permission to modify this outcome.",
    });
    expect(mocks.institutionalOutcome.findUnique).not.toHaveBeenCalled();
    expect(mocks.institutionalOutcome.findMany).not.toHaveBeenCalled();
    expect(mocks.institutionalOutcome.create).not.toHaveBeenCalled();
    expect(mocks.institutionalOutcome.update).not.toHaveBeenCalled();
  });

  it.each([
    DEAN,
    {
      userId: "program-head-1",
      activeRole: ROLES.PROGRAM_HEAD,
      profileGate: COMPLETE_PROFILE_GATE,
    },
    { userId: "faculty-1", activeRole: ROLES.FACULTY, profileGate: COMPLETE_PROFILE_GATE },
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

  it("rejects an inactive Secretary before reading mutation state", async () => {
    mocks.session.mockResolvedValue({
      ...SECRETARY,
      profileGate: { status: "INACTIVE" as const },
    });
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
  });
});