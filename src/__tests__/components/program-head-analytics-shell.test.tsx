import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type React from "react";
import { ProgramHeadAnalyticsShell } from "@/features/analytics/components/program-head-analytics-shell";

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
    expect(links).toHaveLength(6);
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
});
