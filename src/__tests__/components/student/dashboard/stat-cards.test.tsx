import { render, screen } from "@testing-library/react";
import { StatCards } from "@/features/users/components/stat-cards";
import { expect, test, describe } from "vitest";

describe("StatCards", () => {
  test("counts each status and names the tile for screen readers", () => {
    render(
      <StatCards pending={3} inProgress={1} completed={12} evaluationsHref="/student/evaluations" />
    );

    expect(screen.getByRole("link", { name: "Pending: 3" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "In Progress: 1" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Completed: 12" })).toBeInTheDocument();
  });

  test("each status opens the evaluations route on its own tab", () => {
    render(
      <StatCards pending={3} inProgress={1} completed={12} evaluationsHref="/student/evaluations" />
    );

    expect(screen.getByRole("link", { name: "Pending: 3" })).toHaveAttribute(
      "href",
      "/student/evaluations?tab=pending"
    );
    expect(screen.getByRole("link", { name: "In Progress: 1" })).toHaveAttribute(
      "href",
      "/student/evaluations?tab=in-progress"
    );
    expect(screen.getByRole("link", { name: "Completed: 12" })).toHaveAttribute(
      "href",
      "/student/evaluations?tab=submitted"
    );
  });

  test("keeps an existing query on the evaluations route", () => {
    render(
      <StatCards
        pending={0}
        inProgress={0}
        completed={0}
        evaluationsHref="/alumni/evaluations?x=1"
      />
    );

    expect(screen.getByRole("link", { name: "Pending: 0" })).toHaveAttribute(
      "href",
      "/alumni/evaluations?x=1&tab=pending"
    );
  });

  test("shows plain counts, not links, when the evaluations route is unavailable", () => {
    render(<StatCards pending={0} inProgress={0} completed={0} evaluationsHref="" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });
});
