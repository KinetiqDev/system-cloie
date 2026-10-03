// fallow-ignore-file code-duplication
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { ROLES } from "@/lib/constants/roles";

const pathnameMock = vi.hoisted(() => vi.fn(() => "/program-head/programs/program-2/tools/new"));

vi.mock("next/navigation", () => ({ usePathname: pathnameMock }));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- test mock of next/image
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
    vi.unstubAllGlobals();
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
    expect(screen.getByRole("link", { name: "Tools" })).toHaveAttribute("aria-current", "page");
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

  it("keeps every Dean group destination visible without an accordion toggle", () => {
    pathnameMock.mockReturnValue("/dean/dashboard");

    render(<Sidebar roles={[ROLES.DEAN]} />);

    for (const name of [
      "Programs",
      "Courses",
      "Course Assignments",
      "Tools",
      "Learning Outcomes",
    ]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
    const nav = screen.getByRole("navigation", { name: "Dean navigation" });
    expect(within(nav).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse navigation sidebar" })).toBeInTheDocument();
  });

  it("names the collapse control and the navigation it controls", () => {
    render(<Sidebar roles={[ROLES.SECRETARY]} />);

    const toggle = screen.getByRole("button", { name: "Collapse navigation sidebar" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toHaveAttribute(
      "id",
      toggle.getAttribute("aria-controls")
    );
  });

  it("resolves to icons only when collapsed, for every role", () => {
    for (const role of [ROLES.SECRETARY, ROLES.PROGRAM_HEAD, ROLES.FACULTY, ROLES.DEAN]) {
      const { unmount } = render(<Sidebar roles={[role]} collapsed />);

      expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Expand navigation sidebar" })).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Collapse navigation sidebar" })
      ).not.toBeInTheDocument();

      unmount();
    }
  });
  it("shows a destination tooltip on keyboard focus in the collapsed rail", async () => {
    render(<Sidebar roles={[ROLES.SECRETARY]} collapsed />);
    fireEvent.keyDown(document, { key: "Tab" });
    act(() => screen.getByRole("link", { name: "Users" }).focus());
    await waitFor(() =>
      expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveTextContent("Users")
    );
  });

  it("shows Dean destination tooltips in the width-driven tablet rail", async () => {
    pathnameMock.mockReturnValue("/dean/dashboard");
    render(<Sidebar roles={[ROLES.DEAN]} />);
    fireEvent.keyDown(document, { key: "Tab" });
    act(() => screen.getByRole("link", { name: "Dashboard" }).focus());
    await waitFor(() =>
      expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveTextContent("Dashboard")
    );
  });

  it("identifies the collapsed footer avatar on keyboard focus", async () => {
    render(<Sidebar roles={[ROLES.SECRETARY]} collapsed user={{ name: "Ada Lovelace" }} />);
    fireEvent.keyDown(document, { key: "Tab" });
    act(() => screen.getByLabelText("Ada Lovelace").focus());
    await waitFor(() =>
      expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveTextContent(
        "Ada Lovelace"
      )
    );
  });

  it("identifies the Dean footer by keyboard in the tablet rail", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
    pathnameMock.mockReturnValue("/dean/dashboard");
    render(<Sidebar roles={[ROLES.DEAN]} user={{ name: "Ada Lovelace" }} />);

    const avatar = screen.getByRole("img", { name: "Ada Lovelace" });
    expect(avatar.tabIndex).toBe(0);
    fireEvent.keyDown(document, { key: "Tab" });
    act(() => avatar.focus());
    await waitFor(() =>
      expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveTextContent(
        "Ada Lovelace"
      )
    );
  });

  it("keeps the expanded lockup and hides it in the rail", () => {
    const { unmount } = render(<Sidebar roles={[ROLES.SECRETARY]} />);
    expect(screen.getByRole("link", { name: "System CLOIE — Dashboard" })).toBeInTheDocument();
    unmount();

    render(<Sidebar roles={[ROLES.SECRETARY]} collapsed />);
    expect(
      screen.queryByRole("link", { name: "System CLOIE — Dashboard" })
    ).not.toBeInTheDocument();
  });
});
