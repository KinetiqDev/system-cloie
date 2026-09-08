import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SecretaryDashboard } from "@/features/secretary/components/secretary-dashboard";
import type { SecretaryDashboardData } from "@/features/secretary/services/read-secretary-dashboard";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const populatedData: SecretaryDashboardData = {
  activePeriod: { id: "period-1", label: "2026-2027 — 1st Semester — 2nd Term" },
  inventory: {
    users: 27,
    activePrograms: 6,
    activeCourses: 102,
    activeBaselineInstruments: 4,
  },
  attention: {
    studentsAwaitingTermPlacement: 3,
    pendingExternalVerification: 2,
    activeAssignmentsWithoutRoster: 1,
  },
};

describe("SecretaryDashboard", () => {
  it("renders the active period, attention links, inventory, and quick actions", () => {
    render(<SecretaryDashboard data={populatedData} />);

    expect(screen.getByText("2026-2027 — 1st Semester — 2nd Term")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Students awaiting term placement")).toBeInTheDocument();
    expect(screen.getByText("External accounts pending verification")).toBeInTheDocument();
    expect(screen.getByText("Active classes without roster members")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /manage calendar/i })).toHaveAttribute(
      "href",
      "/secretary/school-years"
    );
    expect(screen.getByRole("heading", { name: "Quick actions" })).toBeInTheDocument();
    expect(screen.getByText("102")).toBeInTheDocument();
  });

  it("explains the no-period and no-attention state", () => {
    render(
      <SecretaryDashboard
        data={{
          ...populatedData,
          activePeriod: null,
          attention: {
            studentsAwaitingTermPlacement: 0,
            pendingExternalVerification: 0,
            activeAssignmentsWithoutRoster: 0,
          },
        }}
      />
    );

    expect(screen.getByText("No active Academic Period")).toBeInTheDocument();
    expect(screen.getByText("Action required")).toBeInTheDocument();
    expect(screen.getByText("Nothing needs attention")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /manage calendar/i })).toHaveAttribute(
      "href",
      "/secretary/school-years"
    );
  });
});
