import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type React from "react";
import { NavigationRow, BottomNavRow } from "@/components/layout/navigation-row";

vi.mock("next/link", () => ({
  default: ({
    children,
    prefetch,
    ...props
  }: React.ComponentProps<"a"> & { prefetch?: boolean }) => {
    void prefetch;
    return <a {...props}>{children}</a>;
  },
  useLinkStatus: () => ({ pending: false }),
}));

describe("NavigationRow", () => {
  it("renders a real navigation link with semantic sidebar roles by default", () => {
    render(<NavigationRow href="/secretary/users">Users</NavigationRow>);

    const link = screen.getByRole("link", { name: "Users" });
    expect(link).toHaveAttribute("href", "/secretary/users");
    expect(link).toHaveClass("text-sidebar-foreground/70", "hover:bg-sidebar-accent/40");
    expect(link).not.toHaveClass("bg-sidebar-accent");
  });

  it("applies the selected roles and 44px target when active", () => {
    render(
      <NavigationRow href="/secretary/users" active aria-current="page">
        Users
      </NavigationRow>
    );

    const link = screen.getByRole("link", { name: "Users" });
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link).toHaveClass("bg-sidebar-accent", "text-sidebar-accent-foreground", "min-h-11");
    expect(link).toHaveClass("focus-visible:outline-ring");
  });

  it("centers rail rows for the Dean tablet icon rail", () => {
    render(<NavigationRow href="/dean/dashboard" rail>
      Dashboard
    </NavigationRow>);

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveClass(
      "justify-center",
      "md:min-w-11",
      "lg:justify-start"
    );
  });

  it("applies the compact secondary geometry", () => {
    render(<NavigationRow href="/support" secondary>
      Support
    </NavigationRow>);

    expect(screen.getByRole("link", { name: "Support" })).toHaveClass("text-body-sm");
  });
});

describe("BottomNavRow", () => {
  it("uses the operational primary for the active destination", () => {
    render(
      <BottomNavRow href="/student/dashboard" active aria-current="page">
        Home
      </BottomNavRow>
    );

    const link = screen.getByRole("link", { name: "Home" });
    expect(link).toHaveClass("text-primary", "min-h-11");
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("uses sidebar muted roles when inactive", () => {
    render(<BottomNavRow href="/student/evaluations">Evaluations</BottomNavRow>);

    expect(screen.getByRole("link", { name: "Evaluations" })).toHaveClass(
      "text-sidebar-foreground/60"
    );
  });
});
