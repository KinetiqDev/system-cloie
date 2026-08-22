import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SelectedProgramLayout from "@/app/(app)/program-head/programs/[programId]/layout";

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

describe("selected Program layout", () => {
  it("passes the route Program to the server resolver and renders the selected content", async () => {
    resolveContextMock.mockResolvedValue({
      success: true,
      data: {
        selectedProgram: { id: "program-2", code: "BSED", name: "Secondary Education" },
        authorizedPrograms: [],
        userId: "user-1",
      },
    });

    const result = await SelectedProgramLayout({
      params: Promise.resolve({ programId: "program-2" }),
      children: <div>Selected content</div>,
    });

    expect(resolveContextMock).toHaveBeenCalledWith("program-2");
    render(result);
    expect(screen.getByText("Selected content")).toBeInTheDocument();
  });

  it("does not render selected content when the server rejects the route Program", async () => {
    resolveContextMock.mockResolvedValue({ success: false, error: "Program unavailable" });

    await expect(
      SelectedProgramLayout({
        params: Promise.resolve({ programId: "unassigned" }),
        children: <div />,
      })
    ).rejects.toThrow("NOT_FOUND");
  });
});
