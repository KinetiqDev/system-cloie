import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  it("renders the default variant with semantic tokens", () => {
    render(<Badge>Label</Badge>);
    expect(screen.getByText("Label")).toHaveClass("bg-primary", "text-primary-foreground");
  });

  it.each([
    ["secondary", "bg-secondary", "text-secondary-foreground"],
    ["outline", "border-border", "text-foreground"],
    ["ghost", "hover:bg-muted"],
    ["link", "text-primary"],
  ] as const)("retokenizes the %s variant", (variant, ...expected) => {
    render(<Badge variant={variant}>Label</Badge>);
    expect(screen.getByText("Label")).toHaveClass(...expected);
  });

  it.each([
    ["destructive", "border-danger/30", "bg-danger-soft", "text-danger"],
    ["success", "border-success/30", "bg-success-soft", "text-success"],
    ["warning", "border-warning/30", "bg-warning-soft", "text-warning"],
    ["information", "border-info/30", "bg-info-soft", "text-info"],
  ] as const)("retokenizes the %s variant with semantic status tokens", (variant, border, bg, text) => {
    render(<Badge variant={variant}>Label</Badge>);

    const badge = screen.getByText("Label");
    expect(badge).toHaveClass(border, bg, text);
    expect(badge.className).not.toMatch(/\b(?:bg|border|text)-(?:red|green|yellow|amber)-\d+/);
  });
});
