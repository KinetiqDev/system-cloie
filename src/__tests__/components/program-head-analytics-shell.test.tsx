import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type React from "react";
import { ProgramHeadAnalyticsShell } from "@/features/analytics/components/program-head-analytics-shell";
import { ProgramHeadAnalyticsContentFallback } from "@/features/analytics/components/program-head-analytics-content-fallback";
import SelectedProgramAnalyticsLoading from "@/app/(app)/program-head/programs/[programId]/analytics/loading";

vi.mock("next/link", () => ({
  default: ({
    children,
    prefetch,
    ...props
  }: React.ComponentProps<"a"> & { prefetch?: boolean }) => (
    <a {...props} data-prefetch={String(prefetch)}>
      {children}
    </a>
  ),
  useLinkStatus: () => ({ pending: false }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/features/analytics/components/program-head-analytics-filters", () => ({
  ProgramHeadAnalyticsFilters: () => <div>Filters</div>,
}));

const periodOptions = { schoolYears: [], semesters: [], termInstances: [] };
const scope = { programCode: "BSIT", programName: "Information Technology", periodLabel: null };

describe("ProgramHeadAnalyticsShell", () => {
  it("uses soft-navigation links without speculative analytics prefetch", () => {
    render(
      <ProgramHeadAnalyticsShell
        programId="program-1"
        filters={{
          tab: "trends",
          semester: "FIRST",
          evidenceSource: "COURSE",
        }}
        scope={scope}
        periodOptions={periodOptions}
      >
        <p>Evidence</p>
      </ProgramHeadAnalyticsShell>
    );

    const navigation = screen.getByRole("navigation", { name: "Analytics views" });
    const links = Array.from(navigation.querySelectorAll("a"));
    expect(links).toHaveLength(5);
    for (const link of links) {
      expect(link).toHaveAttribute("data-prefetch", "false");
      expect(link.getAttribute("href")).toContain("semester=FIRST");
      expect(link.getAttribute("href")).toContain("evidenceSource=COURSE");
    }
    expect(screen.getByRole("link", { name: "Trends" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Courses" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-1/analytics?tab=courses&semester=FIRST&evidenceSource=COURSE"
    );
  });

  it("models the active analytics view without replacing the page shell", () => {
    const { rerender } = render(<ProgramHeadAnalyticsContentFallback tab="outcomes" />);

    expect(screen.getByRole("status", { name: "Loading Outcomes evidence" })).toBeInTheDocument();
    expect(screen.getByTestId("analytics-alert-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("analytics-chart-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("analytics-table-skeleton")).toBeInTheDocument();

    rerender(<ProgramHeadAnalyticsContentFallback tab="stakeholders" />);
    expect(
      screen.getByRole("status", { name: "Loading Stakeholders evidence" })
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("analytics-chart-skeleton")).toHaveLength(2);
  });

  it("uses analytics workspace geometry for cold route loading", () => {
    render(<SelectedProgramAnalyticsLoading />);

    expect(screen.getByRole("status", { name: "Loading analytics" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Loading analytics views" })).toBeInTheDocument();
    expect(screen.getByTestId("analytics-filter-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("analytics-chart-skeleton")).toBeInTheDocument();
  });
});
