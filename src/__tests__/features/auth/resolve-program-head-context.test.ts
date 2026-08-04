import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";

const { resolveAuthSessionMock, findManyMock, queryRawMock, programFindUniqueMock } = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  findManyMock: vi.fn(),
  queryRawMock: vi.fn(),
  programFindUniqueMock: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({ resolveAuthSession: resolveAuthSessionMock }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: { programHeadAssignment: { findMany: findManyMock } },
}));

describe("resolve program head context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1", activeRole: ROLES.PROGRAM_HEAD });
    findManyMock.mockResolvedValue([
      { program: { id: "11111111-1111-4111-8111-111111111111", code: "BSED", name: "Secondary Education" } },
      { program: { id: "22222222-2222-4222-8222-222222222222", code: "BEED", name: "Elementary Education" } },
    ]);
  });

  it("returns all authorized Programs and the requested selection", async () => {
    const { resolveProgramHeadContext } = await import("@/features/auth/services/resolve-program-head-context");

    await expect(resolveProgramHeadContext("11111111-1111-4111-8111-111111111111")).resolves.toEqual({
      success: true,
      data: {
        userId: "user-1",
        authorizedPrograms: [
          { id: "22222222-2222-4222-8222-222222222222", code: "BEED", name: "Elementary Education" },
          { id: "11111111-1111-4111-8111-111111111111", code: "BSED", name: "Secondary Education" },
        ],
        selectedProgram: { id: "11111111-1111-4111-8111-111111111111", code: "BSED", name: "Secondary Education" },
      },
    });
  });

  it("queries only active assignments and renders zero active assignments as an empty set", async () => {
    findManyMock.mockResolvedValue([]);
    const { resolveProgramHeadEntry } = await import("@/features/auth/services/resolve-program-head-context");

    await expect(resolveProgramHeadEntry()).resolves.toEqual({
      success: true,
      data: { userId: "user-1", authorizedPrograms: [] },
    });
    expect(findManyMock).toHaveBeenCalledWith({
      where: { program_head_id: "user-1", is_active: true },
      select: { program: { select: { id: true, code: true, name: true } } },
    });
  });

  it.each([["malformed ID", "not-a-uuid"], ["unassigned Program", "33333333-3333-4333-8333-333333333333"]])(
    "rejects %s without exposing a selected Program",
    async (_label, programId) => {
      const { resolveProgramHeadContext } = await import("@/features/auth/services/resolve-program-head-context");
      await expect(resolveProgramHeadContext(programId)).resolves.toMatchObject({ success: false });
    }
  );

  it("denies an inactive assignment because only active rows enter the authority set", async () => {
    findManyMock.mockResolvedValue([
      { program: { id: "22222222-2222-4222-8222-222222222222", code: "BEED", name: "Elementary Education" } },
    ]);
    const { resolveProgramHeadContext } = await import("@/features/auth/services/resolve-program-head-context");

    await expect(resolveProgramHeadContext("11111111-1111-4111-8111-111111111111")).resolves.toMatchObject({
      success: false,
    });
  });

  it.each([["no session", null], ["wrong role", { userId: "user-1", activeRole: ROLES.DEAN }]])(
    "rejects %s",
    async (_label, session) => {
      resolveAuthSessionMock.mockResolvedValue(session);
      const { resolveProgramHeadEntry } = await import("@/features/auth/services/resolve-program-head-context");
      await expect(resolveProgramHeadEntry()).resolves.toMatchObject({ success: false });
      expect(findManyMock).not.toHaveBeenCalled();
    }
  );

  it("rejects a revoked assignment inside a transaction", async () => {
    queryRawMock.mockResolvedValue([{ is_active: false, program_id: "11111111-1111-4111-8111-111111111111" }]);
    const { revalidateProgramHeadAssignment } = await import("@/features/auth/services/resolve-program-head-context");
    const tx = {
      $queryRaw: queryRawMock,
      program: { findUnique: programFindUniqueMock },
    } as never;

    await expect(revalidateProgramHeadAssignment(tx, { userId: "user-1", programId: "11111111-1111-4111-8111-111111111111" })).resolves.toBeNull();
    expect(String(queryRawMock.mock.calls[0]?.[0]?.join(" "))).toContain("FOR UPDATE");
  });
});
