import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

describe("Breadcrumbs", () => {
  it("renders a single current page without a link", () => {
    render(<Breadcrumbs items={[{ label: "Dashboard" }]} />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumbs" });
    expect(nav).toBeInTheDocument();
    const current = screen.getByText("Dashboard");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(nav.querySelector("a")).toBeNull();
  });

  it("renders the full hierarchy with upward links and a current trailing item", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Responses", href: "/responses" },
          { label: "Course evaluations", href: "/responses?tab=course" },
          { label: "EDUC 7 · Morning" },
        ]}
      />
    );
    const nav = screen.getByRole("navigation", { name: "Breadcrumbs" });
    expect(screen.getByRole("link", { name: "Responses" })).toHaveAttribute("href", "/responses");
    expect(screen.getByRole("link", { name: "Course evaluations" })).toHaveAttribute(
      "href",
      "/responses?tab=course"
    );
    expect(screen.getByText("EDUC 7 · Morning")).toHaveAttribute("aria-current", "page");
    expect(nav.textContent).toContain("Responses");
    expect(nav.textContent).toContain("Course evaluations");
    expect(nav.textContent).toContain("EDUC 7 · Morning");
  });

  it("keeps every step in the DOM and collapses only visually beyond three items", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Responses", href: "/responses" },
          { label: "Course evaluations", href: "/responses?tab=course" },
          { label: "EDUC 7 · Morning", href: "/responses/course/e-1" },
          { label: "Maria Santos" },
        ]}
      />
    );
    const nav = screen.getByRole("navigation", { name: "Breadcrumbs" });
    // Full hierarchy stays present for assistive tech.
    expect(screen.getByRole("link", { name: "Course evaluations" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "EDUC 7 · Morning" })).toBeInTheDocument();
    // The middle step collapses to an ellipsis on mobile and returns on md+.
    expect(nav.textContent).toContain("Maria Santos");
    const middleLi = screen.getByRole("link", { name: "EDUC 7 · Morning" }).closest("li");
    expect(middleLi).toHaveClass("hidden");
    expect(middleLi).toHaveClass("md:flex");
  });

  it("does not collapse hierarchies of three items or fewer", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Analytics", href: "/analytics" },
          { label: "Outcomes", href: "/analytics?tab=outcomes" },
          { label: "PLO 2" },
        ]}
      />
    );
    const nav = screen.getByRole("navigation", { name: "Breadcrumbs" });
    expect(nav.querySelector('[aria-hidden="true"] svg.lucide-more-horizontal')).toBeNull();
    const outcomesLi = screen.getByRole("link", { name: "Outcomes" }).closest("li");
    expect(outcomesLi).not.toHaveClass("hidden");
  });
});
