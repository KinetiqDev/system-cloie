import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicRouteLoading } from "@/components/layout/public-route-loading";
import {
  DEFAULT_GRID_CLASS_NAME,
  THREE_CARD_GRID_CLASS_NAME,
} from "@/features/portals/components/portal-shell";
import {
  ROLE_CARDS_RESPONDENT,
  ROLE_CARDS_STAFF,
} from "@/features/portals/lib/role-card-config";

function assertGridHasClasses(grid: HTMLElement, classNames: string) {
  for (const token of classNames.split(" ")) {
    expect(grid.classList.contains(token)).toBe(true);
  }
}

describe("PublicRouteLoading portal skeleton", () => {
  it("renders no buttons and keeps the back-link slot", () => {
    render(<PublicRouteLoading variant="portal" cards={ROLE_CARDS_RESPONDENT} />);

    expect(screen.getByTestId("portal-back-skeleton")).toBeDefined();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("renders one card placeholder per respondent card with the respondent grid", () => {
    const { container } = render(
      <PublicRouteLoading variant="portal" cards={ROLE_CARDS_RESPONDENT} />
    );

    expect(screen.getAllByTestId("portal-card-skeleton")).toHaveLength(
      ROLE_CARDS_RESPONDENT.length
    );
    const grid = container.querySelector(".grid") as HTMLElement;
    assertGridHasClasses(grid, THREE_CARD_GRID_CLASS_NAME);
    expect(container.querySelectorAll(".w-24")).toHaveLength(0);
  });

  it("renders one card placeholder per staff card with the staff grid and badge slots", () => {
    const { container } = render(
      <PublicRouteLoading variant="portal" cards={ROLE_CARDS_STAFF} />
    );

    expect(screen.getAllByTestId("portal-card-skeleton")).toHaveLength(
      ROLE_CARDS_STAFF.length
    );
    const grid = container.querySelector(".grid") as HTMLElement;
    assertGridHasClasses(grid, DEFAULT_GRID_CLASS_NAME);
    const badgeCount = ROLE_CARDS_STAFF.filter(
      (card) => card.category === "pre_provisioned_admin"
    ).length;
    expect(container.querySelectorAll(".w-24")).toHaveLength(badgeCount);
  });
});