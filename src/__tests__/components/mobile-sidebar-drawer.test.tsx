import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type React from "react";
import { ROLES } from "@/lib/constants/roles";
import { MobileSidebarDrawer } from "@/components/layout/mobile-sidebar-drawer";

const pathnameMock = vi.hoisted(() => vi.fn(() => "/dean/academic-structure"));

vi.mock("next/navigation", () => ({ usePathname: pathnameMock }));
vi.mock("next/image", () => ({ default: (props: React.ComponentProps<"img">) => <img {...props} /> }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a> }));

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
});
