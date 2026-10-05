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
    expect(screen.getByRole("link", { name: "Evaluation Tools" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-2/tools"
    );
    expect(screen.getByRole("link", { name: "Evaluation Tools" })).toHaveAttribute(
      "aria-current",
      "page"
    );
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
      "Evaluation Tools",
      "Learning Outcomes",
    ]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
    const nav = screen.getByRole("navigation", { name: "Dean navigation" });
    expect(within(nav).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse navigation sidebar" })).toBeInTheDocument();
  });

  it("keeps a Dean section's destinations inside the rail instead of indenting them", () => {
    render(<Sidebar roles={[ROLES.DEAN]} />);

    const destinations = screen.getByRole("link", { name: "Programs" }).parentElement;

    // A 64px rail has no room for an indent, so the connector is lg-only.
    expect(destinations?.className).toContain("lg:group-data-[collapsed=false]/sidebar:pl-2");
    expect(destinations?.className).not.toMatch(/(^|\s)pl-2(\s|$)/);
  });

  it("marks the Dean's rail sections with a rule and leaves the expanded sidebar to its indent", () => {
    const { container } = render(<Sidebar roles={[ROLES.DEAN]} />);

    const rules = [...container.querySelectorAll("div[aria-hidden='true']")].filter((rule) =>
      rule.className.includes("h-px")
    );

    // One per section, plus the rule that sets Profile apart from them.
    expect(rules).toHaveLength(3);
    expect(rules[0].className).toContain("max-lg:block");
  });

  it.each([
    [0, false, true],
    [260, true, false],
  ])(
    "fades only the rail edge still holding destinations at scrollTop %i",
    (scrollTop, startFaded, endFaded) => {
      const { container } = render(<Sidebar roles={[ROLES.DEAN]} />);
      const nav = screen.getByRole("navigation", { name: "Dean navigation" });
      Object.defineProperty(nav, "clientHeight", { configurable: true, value: 200 });
      Object.defineProperty(nav, "scrollHeight", { configurable: true, value: 460 });
      Object.defineProperty(nav, "scrollTop", { configurable: true, writable: true, value: 0 });

      act(() => {
        nav.scrollTop = scrollTop;
        nav.dispatchEvent(new Event("scroll"));
      });

      expect(container.querySelectorAll(".bg-gradient-to-b")).toHaveLength(startFaded ? 1 : 0);
      expect(container.querySelectorAll(".bg-gradient-to-t")).toHaveLength(endFaded ? 1 : 0);
    }
  );

  it("leaves the rail uncut when every destination already fits", () => {
    const { container } = render(<Sidebar roles={[ROLES.DEAN]} />);
    const nav = screen.getByRole("navigation", { name: "Dean navigation" });
    Object.defineProperty(nav, "clientHeight", { configurable: true, value: 900 });
    Object.defineProperty(nav, "scrollHeight", { configurable: true, value: 460 });

    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    expect(container.querySelector(".bg-gradient-to-b")).toBeNull();
    expect(container.querySelector(".bg-gradient-to-t")).toBeNull();
  });

  it("remeasures fades when folding changes the navigation dimensions", () => {
    let onResize: ResizeObserverCallback | undefined;
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: ResizeObserverCallback) {
          onResize = callback;
        }
        observe = observe;
        disconnect = disconnect;
      }
    );
    const { container, unmount } = render(<Sidebar roles={[ROLES.DEAN]} />);
    const nav = screen.getByRole("navigation", { name: "Dean navigation" });
    Object.defineProperty(nav, "clientHeight", { configurable: true, value: 200 });
    Object.defineProperty(nav, "scrollHeight", { configurable: true, value: 460 });
    expect(observe).toHaveBeenCalledWith(nav);

    act(() => onResize?.([], {} as ResizeObserver));
    expect(container.querySelector(".bg-gradient-to-t")).not.toBeNull();
    Object.defineProperty(nav, "clientHeight", { configurable: true, value: 900 });
    act(() => onResize?.([], {} as ResizeObserver));
    expect(container.querySelector(".bg-gradient-to-t")).toBeNull();
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
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

  it.each([
    [ROLES.SECRETARY, "/secretary/instruments"],
    [ROLES.FACULTY, "/faculty/tools"],
    [ROLES.PROGRAM_HEAD, "/program-head/programs/program-2/tools"],
    [ROLES.DEAN, "/dean/academic-structure/instruments"],
  ])("keeps %s Evaluation Tools accessible in expanded and collapsed navigation", (role, href) => {
    pathnameMock.mockReturnValue(`${href}/new`);

    for (const collapsed of [false, true]) {
      const { unmount } = render(<Sidebar roles={[role]} collapsed={collapsed} />);
      const link = screen.getByRole("link", { name: "Evaluation Tools" });
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAttribute("aria-current", "page");
      expect(screen.queryByRole("link", { name: "Tools" })).not.toBeInTheDocument();
      unmount();
    }
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

  it.each([
    ROLES.SECRETARY,
    ROLES.DEAN,
    ROLES.FACULTY,
    ROLES.PROGRAM_HEAD,
    ROLES.GEN_ED_COORDINATOR,
  ])("names the %s rail on hover with no delay at all", (role) => {
    render(<Sidebar roles={[role]} collapsed />);

    fireEvent.mouseEnter(screen.getByRole("link", { name: "Dashboard" }));

    // No timers run between the pointer arriving and the label existing.
    expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveTextContent("Dashboard");
  });

  it("hands the rail label straight over when the pointer moves between rows", () => {
    render(<Sidebar roles={[ROLES.SECRETARY]} collapsed />);

    fireEvent.mouseEnter(screen.getByRole("link", { name: "Dashboard" }));
    fireEvent.mouseLeave(screen.getByRole("link", { name: "Dashboard" }));
    fireEvent.mouseEnter(screen.getByRole("link", { name: "Users" }));

    const tooltips = document.querySelectorAll('[data-slot="tooltip-content"]');
    expect(tooltips).toHaveLength(1);
    expect(tooltips[0]).toHaveTextContent("Users");
  });

  it("lands the rail label at full contrast instead of fading it in", () => {
    render(<Sidebar roles={[ROLES.SECRETARY]} collapsed />);

    fireEvent.mouseEnter(screen.getByRole("link", { name: "Users" }));

    const tooltip = document.querySelector('[data-slot="tooltip-content"]');
    expect(tooltip?.className).not.toMatch(/animate-in|fade-in|zoom-in/);
    // Leaving is still a release, not a snap.
    expect(tooltip?.className).toMatch(/data-closed:animate-out/);
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
