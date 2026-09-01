import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GenEdDashboardContent } from "@/app/(app)/gen-ed-coordinator/dashboard/page";
import type { GenEdDashboardData } from "@/features/course-assignments/services/read-gen-ed-dashboard";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const populatedData: GenEdDashboardData = {
  period: { id: "term-1", label: "2026-2027 — 1st Semester — 1st Term" },
  coverage: {
    activeCourseCount: 5,
    activeAssignmentCount: 5,
    reachedProgramCount: 2,
    activeProgramCount: 3,
    assignedCourseCount: 4,
    assignmentCoverageRate: 0.8,
  },
  attention: {
    unassignedCourseCount: 1,
    unmappedCiloCount: 3,
    unreachedProgramCount: 1,
    opportunitiesWithoutSubmissions: false,
  },
  evidence: {
    submittedResponseCount: 42,
    evaluationOpportunityCount: 58,
    responseRate: 42 / 58,
    ratingCount: 120,
    meanRating: 4.18,
  },
  evidenceState: "available",
  emptyReason: null,
};

describe("GenEdDashboardContent", () => {
  it("renders balanced coverage, attention, and evidence summaries", () => {
    render(<GenEdDashboardContent data={populatedData} />);

    expect(screen.getByRole("heading", { name: "Coverage at a glance" })).toBeInTheDocument();
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Needs attention" })).toBeInTheDocument();
    expect(screen.getByText("1 active course needs an assignment")).toBeInTheDocument();
    expect(screen.getByText("3 CILOs need Institutional Outcome mapping")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Evidence pulse" })).toBeInTheDocument();
    expect(screen.getByText("42 of 58")).toBeInTheDocument();
    expect(screen.getByText("72.4%")).toBeInTheDocument();
    expect(screen.getByText("4.18")).toBeInTheDocument();
  });

  it("provides one canonical quick action for each owned workflow", () => {
    render(<GenEdDashboardContent data={populatedData} />);

    expect(screen.getByRole("link", { name: /manage general education courses/i })).toHaveAttribute(
      "href",
      "/gen-ed-coordinator/courses"
    );
    expect(
      screen.getByRole("link", { name: /manage institutional learning outcomes/i })
    ).toHaveAttribute("href", "/gen-ed-coordinator/outcomes");
    expect(screen.getByRole("link", { name: /review cilo-to-ilo mappings/i })).toHaveAttribute(
      "href",
      "/gen-ed-coordinator/outcomes/mapping"
    );
    expect(screen.getAllByRole("link", { name: /open general education analytics/i })).toHaveLength(
      1
    );
  });

  it("explains unavailable evidence instead of showing a misleading zero", () => {
    render(
      <GenEdDashboardContent
        data={{
          ...populatedData,
          evidence: {
            submittedResponseCount: 0,
            evaluationOpportunityCount: 0,
            responseRate: null,
            ratingCount: 0,
            meanRating: null,
          },
        }}
      />
    );

    expect(
      screen.getByText("No evaluation opportunities exist for this period yet.")
    ).toBeInTheDocument();
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
  });

  it("keeps the dashboard usable when evidence cannot be loaded", () => {
    render(
      <GenEdDashboardContent
        data={{
          ...populatedData,
          evidence: null,
          evidenceState: "read-failed",
        }}
      />
    );

    expect(
      screen.getByText(
        "Evidence could not be loaded. Refresh this page or open analytics to try again."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /open general education analytics/i })
    ).toBeInTheDocument();
  });

  it("keeps useful actions visible when there is no active period", () => {
    render(
      <GenEdDashboardContent
        data={{
          ...populatedData,
          period: null,
          evidence: null,
          emptyReason: "no-active-period",
        }}
      />
    );

    expect(screen.getByText("No active Academic Period")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Quick actions" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /manage general education courses/i })
    ).toBeInTheDocument();
  });

  it("shows a clear-state message when no actionable gaps exist", () => {
    render(
      <GenEdDashboardContent
        data={{
          ...populatedData,
          attention: {
            unassignedCourseCount: 0,
            unmappedCiloCount: 0,
            unreachedProgramCount: 0,
            opportunitiesWithoutSubmissions: false,
          },
        }}
      />
    );

    expect(screen.getByText("No current General Education gaps")).toBeInTheDocument();
  });
});
