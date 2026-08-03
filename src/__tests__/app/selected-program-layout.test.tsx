import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { notFoundMock, resolveContextMock, headerMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  resolveContextMock: vi.fn(),
  headerMock: vi.fn(({ program }: { program: { code: string } }) => <div>{program.code}</div>),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveContextMock,
}));
vi.mock("@/features/auth/components/program-head-context-header", () => ({
  ProgramHeadContextHeader: headerMock,
}));

describe("selected Program layout", () => {
  it("passes the route Program to the server resolver and renders the selected context", async () => {
    resolveContextMock.mockResolvedValue({
      success: true,
      data: {
        selectedProgram: { id: "program-2", code: "BSED", name: "Secondary Education" },
        authorizedPrograms: [],
        userId: "user-1",
      },
    });
    const Layout = (await import("@/app/(app)/program-head/programs/[programId]/layout")).default;

    const result = await Layout({
      params: Promise.resolve({ programId: "program-2" }),
      children: <div>Selected content</div>,
    });

    expect(resolveContextMock).toHaveBeenCalledWith("program-2");
    render(result);
    expect(headerMock).toHaveBeenCalledWith(
      expect.objectContaining({ program: expect.objectContaining({ code: "BSED" }) }),
      undefined
    );
    expect(result).toBeDefined();
  });

  it("does not render selected content when the server rejects the route Program", async () => {
    headerMock.mockClear();
    resolveContextMock.mockResolvedValue({ success: false, error: "Program unavailable" });
    const Layout = (await import("@/app/(app)/program-head/programs/[programId]/layout")).default;

    await expect(
      Layout({ params: Promise.resolve({ programId: "unassigned" }), children: <div /> })
    ).rejects.toThrow("NOT_FOUND");
    expect(headerMock).not.toHaveBeenCalled();
  });
});
