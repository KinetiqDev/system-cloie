import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type React from "react";
import { SidebarShell } from "@/components/layout/sidebar-shell";
import { SIDEBAR_COLLAPSED_COOKIE } from "@/lib/preferences/sidebar-preference";
import { ROLES } from "@/lib/constants/roles";

vi.mock("next/navigation", () => ({ usePathname: () => "/program-head" }));
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

function renderShell(defaultCollapsed: boolean, isDean = false) {
  const view = render(
    <SidebarShell
      roles={[isDean ? ROLES.DEAN : ROLES.PROGRAM_HEAD]}
      activeProgramId={null}
      isDean={isDean}
      defaultCollapsed={defaultCollapsed}
      header={<div>Topbar</div>}
    >
      <main>Page</main>
    </SidebarShell>
  );
  const content = screen.getByText("Page").parentElement;
  return { ...view, content };
}

describe("SidebarShell", () => {
  it("starts from the server-resolved preference and offsets the content column to match", () => {
    const { content, unmount } = renderShell(false);
    expect(content).toHaveClass("lg:pl-64");
    expect(document.querySelector("aside")).toHaveAttribute("data-collapsed", "false");
    unmount();

    const collapsed = renderShell(true);
    expect(collapsed.content).toHaveClass("lg:pl-16");
    expect(document.querySelector("aside")).toHaveAttribute("data-collapsed", "true");
  });

  it("keeps the Dean tablet rail gutter when expanded and the rail gutter when collapsed", () => {
    const { content, unmount } = renderShell(false, true);
    expect(content).toHaveClass("md:pl-16", "lg:pl-64");
    unmount();

    const collapsed = renderShell(true, true);
    expect(collapsed.content).toHaveClass("lg:pl-16");
    expect(collapsed.content).not.toHaveClass("md:pl-16");
  });

  it("moves the gutter with the control and remembers the choice", () => {
    const { content } = renderShell(false);

    fireEvent.click(screen.getByRole("button", { name: "Collapse navigation sidebar" }));
    expect(content).toHaveClass("lg:pl-16");
    expect(document.cookie).toContain(`${SIDEBAR_COLLAPSED_COOKIE}=1`);

    fireEvent.click(screen.getByRole("button", { name: "Expand navigation sidebar" }));
    expect(content).toHaveClass("lg:pl-64");
    expect(document.cookie).toContain(`${SIDEBAR_COLLAPSED_COOKIE}=0`);
  });

  it("toggles on the platform shortcut, but not while typing in a field", () => {
    renderShell(false);
    const content = screen.getByText("Page").parentElement;

    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(content).toHaveClass("lg:pl-16");

    const field = document.createElement("input");
    document.body.append(field);
    fireEvent.keyDown(field, { key: "b", ctrlKey: true, bubbles: true });
    expect(content).toHaveClass("lg:pl-16");
    field.remove();
  });
});
