import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { ROLES } from "@/lib/constants/roles";

const pathnameMock = vi.hoisted(() => vi.fn(() => "/program-head/programs/program-2/tools/new"));

vi.mock("next/navigation", () => ({ usePathname: pathnameMock }));
vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => <img alt={props.alt ?? ""} {...props} />,
}));
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

describe("Program Head desktop navigation", () => {
  afterEach(() => {
    pathnameMock.mockReturnValue("/program-head/programs/program-2/tools/new");
    vi.restoreAllMocks();
  });

  it("preserves the selected Program and marks one current destination", () => {
    render(<Sidebar roles={[ROLES.PROGRAM_HEAD]} />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-2/dashboard"
    );
    expect(screen.getByRole("link", { name: "Tools" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-2/tools"
    );
    expect(screen.getByRole("link", { name: "Curricula" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-2/curricula"
    );
    expect(screen.getByRole("link", { name: "Tools" })).toHaveAttribute("aria-current", "page");
    expect(
      screen.getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page")
    ).toHaveLength(1);
  });

  it("marks Curricula current within selected Program context", () => {
    pathnameMock.mockReturnValue("/program-head/programs/program-2/curricula");
    render(<Sidebar roles={[ROLES.PROGRAM_HEAD]} />);

    expect(screen.getByRole("link", { name: "Curricula" })).toHaveAttribute("aria-current", "page");
    expect(
      screen.getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page")
    ).toHaveLength(1);
  });

  it.each(["/program-head/profile", "/program-head/courses"])(
    "does not duplicate entry-route management links at %s",
    (pathname) => {
      pathnameMock.mockReturnValue(pathname);
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

      render(<Sidebar roles={[ROLES.PROGRAM_HEAD]} />);

      expect(screen.getAllByRole("link")).toHaveLength(10);
      expect(screen.getAllByRole("link", { name: "Dashboard" })[0]).toHaveAttribute(
        "href",
        "/program-head"
      );
      expect(consoleError).not.toHaveBeenCalled();
    }
  );

  it("points the brand block at the respective dashboard", () => {
    pathnameMock.mockReturnValue("/program-head/programs/program-2/tools/new");

    render(<Sidebar roles={[ROLES.PROGRAM_HEAD]} />);

    expect(screen.getByRole("link", { name: "System CLOIE — Dashboard" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-2/dashboard"
    );
  });

  it("applies semantic sidebar roles to active and inactive rows", () => {
    render(<Sidebar roles={[ROLES.PROGRAM_HEAD]} />);

    const tools = screen.getByRole("link", { name: "Tools" });
    expect(tools).toHaveAttribute("aria-current", "page");
    expect(tools).toHaveClass("bg-sidebar-accent", "text-sidebar-accent-foreground", "min-h-11");

    const dashboard = screen.getByRole("link", { name: "Dashboard" });
    expect(dashboard).not.toHaveClass("bg-sidebar-accent");
    expect(dashboard).toHaveClass("text-sidebar-foreground/70", "hover:bg-sidebar-accent/40");
  });

  it("marks the Dean rail surface with sidebar roles", () => {
    pathnameMock.mockReturnValue("/dean/academic-structure/programs");

    render(<Sidebar roles={[ROLES.DEAN]} />);

    expect(screen.getByRole("link", { name: "Programs" })).toHaveClass(
      "bg-sidebar-accent",
      "min-h-11"
    );
    const structure = screen.getByRole("link", { name: "Academic Structure" });
    expect(structure).not.toHaveClass("bg-sidebar-accent");
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveClass("md:min-w-11");
  });
});

describe("Secretary desktop navigation", () => {
  afterEach(() => {
    pathnameMock.mockReturnValue("/program-head/programs/program-2/tools/new");
    vi.restoreAllMocks();
  });

  it("exposes Curricula and marks it as the one current destination", () => {
    pathnameMock.mockReturnValue("/secretary/curricula");
    render(<Sidebar roles={[ROLES.SECRETARY]} />);

    expect(screen.getByRole("link", { name: "Curricula" })).toHaveAttribute(
      "href",
      "/secretary/curricula"
    );
    expect(screen.getByRole("link", { name: "Curricula" })).toHaveAttribute("aria-current", "page");
    expect(
      screen.getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page")
    ).toHaveLength(1);
  });
});
