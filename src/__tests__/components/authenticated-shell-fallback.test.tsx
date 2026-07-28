import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthenticatedShellFallback } from "@/components/layout/authenticated-shell-fallback";

describe("AuthenticatedShellFallback", () => {
  it("renders a role-neutral loading shell without protected content or actions", () => {
    render(<AuthenticatedShellFallback />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading application")).toBeInTheDocument();
    expect(
      screen.queryByText(/Secretary|Dean|Program Head|Faculty|Student|Alumni|Industry Partner/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/Logout|No email provided|@/i)).not.toBeInTheDocument();
  });
});
