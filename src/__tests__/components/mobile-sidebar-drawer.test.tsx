import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type React from "react";
import { ROLES } from "@/lib/constants/roles";
import { MobileSidebarDrawer } from "@/components/layout/mobile-sidebar-drawer";

const pathnameMock = vi.hoisted(() => vi.fn(() => "/dean/academic-structure"));

vi.mock("next/navigation", () => ({ usePathname: pathnameMock }));
vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => <img alt={props.alt ?? ""} {...props} />,
}));
vi.mock("next/link", () => ({
  default: ({ children, prefetch, ...props }: React.ComponentProps<"a"> & { prefetch?: boolean }) => {
    void prefetch;
    return <a {...props}>{children}</a>;
  },
  useLinkStatus: () => ({ pending: false }),
}));

describe("Dean mobile navigation drawer", () => {
  it("opens with first navigation link focused and locks scroll", async () => {
    render(<MobileSidebarDrawer roles={[ROLES.DEAN]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));

    await waitFor(() => expect(screen.getByRole("link", { name: "Dashboard" })).toHaveFocus());
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes on Escape and restores trigger focus", async () => {
    render(<MobileSidebarDrawer roles={[ROLES.DEAN]} />);
    const trigger = screen.getByRole("button", { name: "Open navigation menu" });
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("wraps keyboard focus at drawer edges", async () => {
    render(<MobileSidebarDrawer roles={[ROLES.DEAN]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    await waitFor(() => expect(screen.getByRole("link", { name: "Dashboard" })).toHaveFocus());

    const close = screen.getByRole("button", { name: "Close navigation menu" });
    close.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveFocus();

    screen.getByRole("link", { name: "Dashboard" }).focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(close).toHaveFocus();
  });

  it("wraps from the last interactive element back to the first", async () => {
    render(<MobileSidebarDrawer roles={[ROLES.DEAN]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    const dialog = screen.getByRole("dialog");
    const interactive = dialog.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
    );
    const last = interactive[interactive.length - 1];
    const first = interactive[0];
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(first).toHaveFocus();
  });

  it("closes on backdrop and navigation link activation", async () => {
    render(<MobileSidebarDrawer roles={[ROLES.DEAN]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Academic Structure", { selector: "a" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("dialog").previousSibling as HTMLElement);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("marks only the deepest Dean destination current in the drawer", async () => {
    pathnameMock.mockReturnValue("/dean/academic-structure/courses/course-1/edit");
    render(<MobileSidebarDrawer roles={[ROLES.DEAN]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(screen.getByRole("dialog").querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Courses" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Academic Structure" })).not.toHaveAttribute(
      "aria-current"
    );
  });
});
