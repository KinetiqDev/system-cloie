import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";

const revalidatePathSpy = vi.hoisted(() => vi.fn());
const resolveAuthSessionMock = vi.hoisted(() => vi.fn());
const preflightMock = vi.hoisted(() => vi.fn());
const deleteMock = vi.hoisted(() => vi.fn());
const toggleMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathSpy }));
vi.mock("@/features/auth/services/resolve-auth-session", () => ({ resolveAuthSession: resolveAuthSessionMock }));
vi.mock("@/features/academic-structure/services/manage-programs", () => ({
  preflightProgramDeletion: preflightMock,
  deleteProgram: deleteMock,
  toggleProgramActive: toggleMock,
}));

import { deleteProgramAction, preflightProgramDeletionAction, toggleProgramActiveAction } from "@/lib/actions/admin-program-actions";

const id = "11111111-1111-4111-a111-111111111111";
const revision = "2026-07-11T00:00:00.000Z";

describe("Program lifecycle actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue(createAuthSessionSnapshot({ userId: id, roles: [ROLES.SECRETARY] }));
    preflightMock.mockResolvedValue({ success: true, data: {} });
    deleteMock.mockResolvedValue({ success: true, data: { id } });
    toggleMock.mockResolvedValue({ success: true, data: undefined });
  });

  it.each([null, createAuthSessionSnapshot({ userId: id, roles: [ROLES.PROGRAM_HEAD] })])("rejects unauthorized preflight", async (session) => {
    resolveAuthSessionMock.mockResolvedValue(session);
    expect(await preflightProgramDeletionAction(id)).toEqual({ success: false, error: session ? "Insufficient permissions." : "Authentication required." });
    expect(preflightMock).not.toHaveBeenCalled();
  });

  it.each([null, createAuthSessionSnapshot({ userId: id, roles: [ROLES.PROGRAM_HEAD] })])("rejects unauthorized deletion", async (session) => {
    resolveAuthSessionMock.mockResolvedValue(session);

    expect(await deleteProgramAction({ id, confirmationCode: "BSCS", revision })).toEqual({
      success: false,
      error: session ? "Insufficient permissions." : "Authentication required.",
    });
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("allows Dean to preflight", async () => {
    resolveAuthSessionMock.mockResolvedValue(createAuthSessionSnapshot({ userId: id, roles: [ROLES.DEAN] }));

    await expect(preflightProgramDeletionAction(id)).resolves.toEqual({ success: true, data: {} });
    expect(preflightMock).toHaveBeenCalledWith(id);
  });

  it("trims confirmation input, preserves case, and revalidates both catalogs only after success", async () => {
    const result = await deleteProgramAction({ id, confirmationCode: " BSCS ", revision });

    expect(deleteMock).toHaveBeenCalledWith({ id, confirmationCode: "BSCS", revision });
    expect(revalidatePathSpy).toHaveBeenCalledWith("/secretary/programs");
    expect(revalidatePathSpy).toHaveBeenCalledWith("/dean/academic-structure/programs");
    expect(result).toEqual({ success: true, data: { id } });
  });

  it("does not revalidate failed deletion", async () => {
    deleteMock.mockResolvedValue({ success: false, error: "Program changed after preflight." });

    const result = await deleteProgramAction({ id, confirmationCode: "BSCS", revision });

    expect(result).toEqual({ success: false, error: "Program changed after preflight." });
    expect(revalidatePathSpy).not.toHaveBeenCalled();
  });

  it("rejects invalid confirmation input before service call", async () => {
    const result = await deleteProgramAction({ id, confirmationCode: "bscs", revision: "not-a-date" });

    expect(result).toEqual({ success: false, error: "Invalid deletion confirmation." });
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("passes expected status for conditional lifecycle update", async () => {
    await toggleProgramActiveAction(id, false, true);
    expect(toggleMock).toHaveBeenCalledWith(id, false, true);
  });
});
