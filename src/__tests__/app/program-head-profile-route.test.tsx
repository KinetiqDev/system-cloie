import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type React from "react";

const { resolveAuthSessionMock, userFindUniqueMock, redirectMock } = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));
vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: { user: { findUnique: userFindUniqueMock } },
}));

describe("Program Head profile route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    userFindUniqueMock.mockResolvedValue({
      name: "Program Head",
      email: "head@example.com",
      program_head_assignments: [
        { program: { id: "program-1", code: "BEED", name: "Elementary Education" } },
        { program: { id: "program-2", code: "BSED", name: "Secondary Education" } },
      ],
    });
  });

  it("shows every active assignment and returns management selection to entry", async () => {
    const { default: Page } = await import("@/app/(app)/program-head/profile/page");

    render(await Page());

    expect(screen.getByText("Program Head")).toBeInTheDocument();
    expect(screen.getByText("Elementary Education")).toBeInTheDocument();
    expect(screen.getByText("Secondary Education")).toBeInTheDocument();
    expect(userFindUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          name: true,
          email: true,
        }),
      })
    );
    expect(screen.getByRole("link", { name: "Choose a Program to manage" })).toHaveAttribute(
      "href",
      "/program-head"
    );
    expect(screen.queryByRole("link", { name: /Open (BEED|BSED)/ })).not.toBeInTheDocument();
  });
});
