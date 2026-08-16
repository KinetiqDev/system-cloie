import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { notFoundMock, resolveContextMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  resolveContextMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveContextMock,
}));
// ProgramHeadContextHeader removed from selected program layout; verified in header/topbar

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
    const { container } = render(result);
    expect(container).toHaveTextContent("Selected content");
    expect(result).toBeDefined();
  });

  it("does not render selected content when the server rejects the route Program", async () => {
    // When resolver fails, layout throws NOT_FOUND
    resolveContextMock.mockResolvedValue({ success: false, error: "Program unavailable" });
    const Layout = (await import("@/app/(app)/program-head/programs/[programId]/layout")).default;

    await expect(
      Layout({ params: Promise.resolve({ programId: "unassigned" }), children: <div /> })
    ).rejects.toThrow("NOT_FOUND");
    // Header is no longer in layout
  });
});
