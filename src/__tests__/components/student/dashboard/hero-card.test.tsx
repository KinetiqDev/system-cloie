import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { HeroCard } from "@/features/portals/components/hero-card";

describe("HeroCard", () => {
  test("renders student information correctly", () => {
    render(<HeroCard name="Andy" contextLabel="BSIT • 4th Year • 2026-2027" />);

    expect(screen.getByText(/Welcome, Andy/i)).toBeDefined();
    expect(screen.getByText(/BSIT • 4th Year • 2026-2027/i)).toBeDefined();
  });

  test("does not render an evaluations CTA (navigation covers it)", () => {
    render(<HeroCard name="Andy" contextLabel="BSIT • 4th Year • 2026-2027" />);

    expect(screen.queryByRole("button", { name: /evaluations/i })).toBeNull();
  });
});
