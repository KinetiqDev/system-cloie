import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type React from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ROLES } from "@/lib/constants/roles";

const pathnameMock = vi.hoisted(() => vi.fn(() => "/student/evaluations"));

vi.mock("next/navigation", () => ({ usePathname: pathnameMock }));
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

describe("MobileNav", () => {
  afterEach(() => {
    pathnameMock.mockReturnValue("/student/evaluations");
  });

  it("renders the respondent bottom navigation with one current destination", () => {
    render(<MobileNav roles={[ROLES.STUDENT]} />);

    const nav = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Evaluations" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/student/dashboard"
    );
  });

  it("keeps labels at the approved label floor with 44px targets", () => {
    render(<MobileNav roles={[ROLES.STUDENT]} />);

    const link = screen.getByRole("link", { name: "Home" });
    expect(link).toHaveClass("min-h-11");
    expect(link.querySelector("span")).toHaveClass("text-label-sm");
  });

  it("marks the deepest destination current and keeps ancestors unmarked", () => {
    pathnameMock.mockReturnValue("/alumni/history/2025-2026");

    render(<MobileNav roles={[ROLES.ALUMNI]} />);

    expect(screen.getByRole("link", { name: "Submission History" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("navigation", { name: "Primary navigation" })
      .querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });
});
