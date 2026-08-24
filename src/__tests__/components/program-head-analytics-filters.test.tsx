import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgramHeadAnalyticsFilters } from "@/features/analytics/components/program-head-analytics-filters";
import type { ProgramHeadAnalyticsPeriodOptions } from "@/features/analytics/program-head-analytics-types";

const options: ProgramHeadAnalyticsPeriodOptions = {
  schoolYears: [{ id: "sy-2025", label: "2025-2026" }],
  semesters: [{ value: "FIRST", label: "1st Semester" }],
  termInstances: [
    {
      id: "term-1",
      schoolYearId: "sy-2025",
      schoolYearLabel: "2025-2026",
      semester: "FIRST",
      semesterLabel: "1st Semester",
      termLabel: "1st Term",
      label: "2025-2026 · 1st Semester · 1st Term",
    },
  ],
};

const baseFilters = { tab: "outcomes" as const };

describe("ProgramHeadAnalyticsFilters", () => {
  it("keeps evidence-scope controls when no period options exist", () => {
    render(
      <ProgramHeadAnalyticsFilters
        programId="program-bsed"
        filters={baseFilters}
        options={{ schoolYears: [], semesters: [], termInstances: [] }}
      />
    );

    expect(screen.getByLabelText("Evidence source")).toBeInTheDocument();
    expect(screen.queryByLabelText("School Year")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Semester")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Academic Term")).not.toBeInTheDocument();
  });

  it("shows the active-filter count on the mobile trigger and All periods when clean", () => {
    const { rerender } = render(
      <ProgramHeadAnalyticsFilters
        programId="program-bsed"
        filters={baseFilters}
        options={options}
      />
    );

    expect(screen.getByText("All periods")).toBeInTheDocument();

    rerender(
      <ProgramHeadAnalyticsFilters
        programId="program-bsed"
        filters={{ ...baseFilters, schoolYearId: "sy-2025" }}
        options={options}
      />
    );
    expect(screen.getByText("1 active")).toBeInTheDocument();

    rerender(
      <ProgramHeadAnalyticsFilters
        programId="program-bsed"
        filters={{ ...baseFilters, schoolYearId: "sy-2025", semester: "FIRST", termInstanceId: "term-1" }}
        options={options}
      />
    );
    expect(screen.getByText("3 active")).toBeInTheDocument();
  });

  it("submits the canonical analytics URL and preserves the active tab", () => {
    const { container } = render(
      <ProgramHeadAnalyticsFilters
        programId="program-bsed"
        filters={{ ...baseFilters, tab: "trends" }}
        options={options}
      />
    );

    const forms = container.querySelectorAll("form");
    expect(forms.length).toBeGreaterThanOrEqual(1);
    for (const form of forms) {
      expect((form as HTMLFormElement).getAttribute("action")).toBe(
        "/program-head/programs/program-bsed/analytics"
      );
      const tab = form.querySelector('input[name="tab"]') as HTMLInputElement | null;
      expect(tab).not.toBeNull();
      expect(tab!.value).toBe("trends");
    }
  });

  it("keeps the Reset link on the active tab without other filters", () => {
    render(
      <ProgramHeadAnalyticsFilters
        programId="program-bsed"
        filters={{ ...baseFilters, tab: "outcomes", schoolYearId: "sy-2025" }}
        options={options}
      />
    );

    const resetLinks = screen.getAllByRole("link", { name: "Reset" });
    for (const link of resetLinks) {
      expect(link).toHaveAttribute(
        "href",
        "/program-head/programs/program-bsed/analytics?tab=outcomes"
      );
    }
  });

  it("opens the mobile Drawer with scope filters and Apply controls", async () => {
    render(
      <ProgramHeadAnalyticsFilters
        programId="program-bsed"
        filters={{ ...baseFilters, termInstanceId: "term-1" }}
        options={options}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Filters/ }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Analytics scope filters")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("School Year")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Semester")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Academic Term")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Apply filters" })).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Reset" })).toBeInTheDocument();
  });
});