import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type React from "react";
import { BackLink } from "@/components/ui/back-link";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("BackLink", () => {
  it("renders upward navigation as a link with an accessible name", () => {
    render(<BackLink href="/program-head/tools">Back to Tools</BackLink>);

    const link = screen.getByRole("link", { name: "Back to Tools" });
    expect(link).toHaveAttribute("href", "/program-head/tools");
  });

  it("renders a guarded action as a button when navigation needs confirmation", () => {
    const onClick = vi.fn();
    render(<BackLink onClick={onClick}>Back to Tools</BackLink>);

    const button = screen.getByRole("button", { name: "Back to Tools" });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("hides the decorative icon from assistive technology", () => {
    const { container } = render(<BackLink href="/tools">Back to Tools</BackLink>);

    const icon = container.querySelector("svg");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
  });
});
