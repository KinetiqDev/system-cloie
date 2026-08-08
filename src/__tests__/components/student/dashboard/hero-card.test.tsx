import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { HeroCard } from "@/features/portals/components/hero-card";

describe("HeroCard", () => {
  test("renders student information correctly", () => {
    render(<HeroCard name="Andy" contextLabel="BSIT • 4th Year • 2026-2027" />);

    expect(screen.getByText(/Welcome, Andy/i)).toBeDefined();
    expect(screen.getByText(/BSIT • 4th Year • 2026-2027/i)).toBeDefined();
  });

  test("contains a link to my evaluations", () => {
    render(<HeroCard name="Andy" contextLabel="BSIT • 4th Year • 2026-2027" />);

    const link = screen.getByRole("button", { name: /My Evaluations/i });
    expect(link.getAttribute("href")).toBe("/student/evaluations");
  });

  test("CTA keeps on-primary foreground and hover overrides from the outline variant", () => {
    render(<HeroCard name="Andy" contextLabel="BSIT • 4th Year • 2026-2027" />);

    const link = screen.getByRole("button", { name: /My Evaluations/i });
    const cls = link.getAttribute("class") ?? "";

    expect(cls).toContain("bg-transparent");
    expect(cls).toContain("text-on-primary");
    expect(cls).toContain("hover:text-on-primary");
    expect(cls).toContain("hover:bg-primary-hover");
    expect(cls).not.toContain("hover:bg-muted");
    expect(cls).not.toContain("hover:text-foreground");
  });
});
