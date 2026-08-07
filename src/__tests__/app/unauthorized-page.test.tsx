import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UnauthorizedPage from "@/app/unauthorized/page";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("UnauthorizedPage", () => {
  it("states the role-access limitation and offers the safe path home", () => {
    render(<UnauthorizedPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Unauthorized" })).toBeInTheDocument();
    expect(
      screen.getByText(/your current role cannot access this section/)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to dashboard" })).toHaveAttribute(
      "href",
      "/dashboard"
    );
  });
});
