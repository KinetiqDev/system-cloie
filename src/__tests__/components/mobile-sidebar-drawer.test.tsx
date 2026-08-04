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

  it("wraps backward focus from the first interactive element", async () => {
    render(<MobileSidebarDrawer roles={[ROLES.DEAN]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    await waitFor(() => expect(screen.getByRole("link", { name: "Dashboard" })).toHaveFocus());

    const close = screen.getByRole("button", { name: "Close navigation menu" });
    close.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    const interactive = screen
      .getByRole("dialog")
      .querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
      );
    const last = interactive[interactive.length - 1];
    expect(last).toHaveFocus();
  });

  it("does not intercept forward focus before the last interactive element", async () => {
    render(<MobileSidebarDrawer roles={[ROLES.DEAN]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Close navigation menu" })).toBeInTheDocument()
    );

    const close = screen.getByRole("button", { name: "Close navigation menu" });
    close.focus();
    const event = new KeyboardEvent("keydown", { key: "Tab", cancelable: true });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
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

  it("preserves the selected Program in Program Head drawer links", async () => {
    pathnameMock.mockReturnValue("/program-head/programs/program-2/outcomes/mapping");
    render(<MobileSidebarDrawer roles={[ROLES.PROGRAM_HEAD]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-2/dashboard"
    );
    expect(screen.getByRole("link", { name: "Outcomes" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-2/outcomes"
    );
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute(
      "href",
      "/program-head/profile"
    );
    expect(screen.getByRole("dialog").querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Outcomes" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("does not duplicate Program Head entry-route links without a Selected Program context", async () => {
    pathnameMock.mockReturnValue("/program-head/profile");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<MobileSidebarDrawer roles={[ROLES.PROGRAM_HEAD]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/program-head"
    );
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
