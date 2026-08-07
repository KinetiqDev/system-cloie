import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function renderAlert(variant: React.ComponentProps<typeof Alert>["variant"]) {
  return render(
    <Alert variant={variant}>
      <AlertTitle>Alert title</AlertTitle>
      <AlertDescription>Alert description</AlertDescription>
    </Alert>
  );
}

describe("Alert", () => {
  it("renders with role=alert and semantic neutral tokens", () => {
    renderAlert(undefined);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("border-border", "bg-card", "text-card-foreground");
    expect(screen.getByText("Alert title")).toBeInTheDocument();
    expect(screen.getByText("Alert description")).toBeInTheDocument();
  });

  it.each([
    ["destructive", "border-danger/50", "bg-danger-soft", "text-danger"],
    ["success", "border-success/50", "bg-success-soft", "text-success"],
    ["warning", "border-warning/50", "bg-warning-soft", "text-warning"],
    ["information", "border-info/50", "bg-info-soft", "text-info"],
  ] as const)("retokenizes the %s variant with semantic status tokens", (variant, border, bg, text) => {
    renderAlert(variant);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass(border, bg, text);
    expect(alert.className).not.toMatch(/\b(?:bg|border|text)-(?:red|green|yellow|amber)-\d+/);
  });
});
