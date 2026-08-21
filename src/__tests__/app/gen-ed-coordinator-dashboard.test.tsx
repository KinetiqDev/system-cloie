import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GenEdDashboardContent } from "@/app/(app)/gen-ed-coordinator/dashboard/page";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

describe("GenEdDashboardContent", () => {
  it("renders KPIs with tabular-nums and no empty when data exists", () => {
    render(<GenEdDashboardContent data={{ activeAssignments: 5, geCourses: 3, programsWithAssignments: 2, emptyReason: null }} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("College-Wide")).toBeInTheDocument();
    expect(screen.getByText("General Education")).toBeInTheDocument();
    expect(screen.queryByText(/no general education courses/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no active general education assignments/i)).not.toBeInTheDocument();
  });

  it("shows no-courses Empty without dead-end CTA", () => {
    render(<GenEdDashboardContent data={{ activeAssignments: 0, geCourses: 0, programsWithAssignments: 0, emptyReason: "no-courses" }} />);
    expect(screen.getByText(/no general education courses in catalog/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /assign faculty/i })).not.toBeInTheDocument();
  });

  it("shows no-assignments Empty with Assign faculty CTA", () => {
    render(<GenEdDashboardContent data={{ activeAssignments: 0, geCourses: 2, programsWithAssignments: 0, emptyReason: "no-assignments" }} />);
    expect(screen.getByText(/no active general education assignments yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /assign faculty/i })).toHaveAttribute("href", "/gen-ed-coordinator/course-assignments");
  });

  it("wraps KPIs in 1/2/4 grid", () => {
    const { container } = render(<GenEdDashboardContent data={{ activeAssignments: 1, geCourses: 1, programsWithAssignments: 1, emptyReason: null }} />);
    const grid = container.querySelector("div.grid.grid-cols-1");
    expect(grid?.className).toContain("sm:grid-cols-2");
    expect(grid?.className).toContain("lg:grid-cols-4");
  });
});
