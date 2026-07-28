import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type React from "react";
import { NavigationLink } from "@/components/layout/navigation-link";

const pendingMock = vi.hoisted(() => vi.fn(() => ({ pending: false })));

vi.mock("next/link", () => ({
  default: ({ children, prefetch, ...props }: React.ComponentProps<"a"> & { prefetch?: boolean }) => {
    void prefetch;
    return <a {...props}>{children}</a>;
  },
  useLinkStatus: pendingMock,
}));

describe("NavigationLink", () => {
  it("exposes subtle local pending feedback without disabling the link", () => {
    pendingMock.mockReturnValue({ pending: true });

    render(
      <NavigationLink href="/dean/dashboard">
        Dashboard
      </NavigationLink>
    );

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dean/dashboard");
    expect(screen.getByRole("link", { name: "Dashboard" }).querySelector("span")).toHaveClass(
      "animate-pulse",
      "opacity-100"
    );
  });
});
