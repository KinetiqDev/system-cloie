import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PortalShell } from "@/features/portals/components/portal-shell";
import {
  ROLE_CARDS_RESPONDENT,
  ROLE_CARDS_STAFF,
} from "@/features/portals/lib/role-card-config";

vi.mock("@/features/portals/components/role-selection-card", () => ({
  RoleSelectionCard: ({ config }: { config: { role: string } }) => (
    <div data-testid={`role-card-${config.role}`} />
  ),
}));

vi.mock("@/features/portals/components/session-banner", () => ({
  SessionBanner: () => null,
}));

describe("PortalShell role-card layout", () => {
  const renderShell = (cards: typeof ROLE_CARDS_RESPONDENT) =>
    render(
      <PortalShell
        title="Portal"
        subtitle="Choose a role"
        cards={cards}
        session={null}
      />
    );

  it("uses a centered three-column desktop grid for respondent cards", () => {
    const { getByTestId } = renderShell(ROLE_CARDS_RESPONDENT);
    const grid = getByTestId(`role-card-${ROLE_CARDS_RESPONDENT[0].role}`).parentElement;

    expect(grid).toHaveClass(
      "mx-auto",
      "max-w-5xl",
      "grid",
      "gap-6",
      "grid-cols-1",
      "sm:grid-cols-2",
      "lg:grid-cols-3"
    );
    expect(grid).not.toHaveClass("xl:grid-cols-4");
  });

  it("retains the four-column desktop grid for staff cards", () => {
    const { getByTestId } = renderShell(ROLE_CARDS_STAFF);
    const grid = getByTestId(`role-card-${ROLE_CARDS_STAFF[0].role}`).parentElement;

    expect(grid).toHaveClass("grid-cols-1", "sm:grid-cols-2", "lg:grid-cols-3", "xl:grid-cols-4");
    expect(grid).not.toHaveClass("max-w-5xl");
  });

  it("renders no decorative blur or glow decoration", () => {
    const { container } = renderShell(ROLE_CARDS_RESPONDENT);
    expect(container.querySelector("[class*='blur-']")).toBeNull();
    expect(container.querySelector("[class*='bg-primary/5']")).toBeNull();
  });

  it("uses semantic heading and muted text tokens", () => {
    const { container } = renderShell(ROLE_CARDS_RESPONDENT);
    expect(container.querySelector(".text-heading-xl")).not.toBeNull();
    expect(container.querySelector(".text-text-secondary")).toBeNull();
    expect(container.querySelector(".text-text-muted")).toBeNull();
  });
});
