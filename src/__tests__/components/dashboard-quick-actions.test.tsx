import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type React from "react";
import { BookOpenCheck, UsersRound } from "lucide-react";
import { DashboardQuickActions } from "@/components/dashboard-quick-actions";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

const actions = [
  {
    href: "/faculty/course-rosters",
    label: "Review my course rosters",
    detail: "Open rosters and manage students.",
    icon: UsersRound,
  },
  {
    href: "/faculty/cilos",
    label: "Manage CILOs",
    detail: "Maintain the course outcome catalog.",
    icon: BookOpenCheck,
  },
];

describe("DashboardQuickActions", () => {
  it("exposes one navigation landmark headed by the title", () => {
    render(
      <DashboardQuickActions
        title="Quick actions"
        description="Continue common Faculty work"
        actions={actions}
      />
    );

    expect(screen.getByRole("heading", { name: "Quick actions" })).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Quick actions" });
    expect(within(nav).getAllByRole("link")).toHaveLength(2);
  });

  it("links every action to its destination with its detail visible", () => {
    render(
      <DashboardQuickActions
        title="Quick actions"
        description="Continue common Faculty work"
        actions={actions}
      />
    );

    const nav = screen.getByRole("navigation", { name: "Quick actions" });
    expect(within(nav).getByRole("link", { name: /review my course rosters/i })).toHaveAttribute(
      "href",
      "/faculty/course-rosters"
    );
    expect(within(nav).getByRole("link", { name: /manage cilos/i })).toHaveAttribute(
      "href",
      "/faculty/cilos"
    );
    expect(screen.getByText("Open rosters and manage students.")).toBeInTheDocument();
  });
});
