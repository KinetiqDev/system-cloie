import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StakeholderMeanPieChart } from "@/features/analytics/components/stakeholder-mean-pie-chart";
import { MeanBarChart } from "@/features/analytics/components/mean-bar-chart";

function sectorFills(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll(".recharts-pie-sector path")).map(
    (path) => path.getAttribute("fill") ?? ""
  );
}

describe("StakeholderMeanPieChart", () => {
  const stakeholders = [
    { label: "Student", mean: 4.42, responseCount: 128 },
    { label: "Alumni", mean: 4.18, responseCount: 64 },
    { label: "Industry Partner", mean: 3.86, responseCount: 41 },
    { label: "Instructor", mean: 4.65, responseCount: 32 },
    { label: "Support Staff", mean: 3.94, responseCount: 27 },
    { label: "Graduate Student", mean: 4.3, responseCount: 19 },
  ];

  it("renders an empty state when no stakeholder data exists", () => {
    render(<StakeholderMeanPieChart data={[]} />);

    expect(screen.getByText("No stakeholder data yet")).toBeInTheDocument();
  });

  it("resolves fills from semantic tokens and hatches beyond five categories", () => {
    const { container } = render(<StakeholderMeanPieChart data={stakeholders} />);

    const fills = sectorFills(container);
    expect(fills[4]).toBe("var(--chart-5)");
    expect(fills[5]).toMatch(/^url\(#stakeholder-mean-[A-Za-z0-9_]+-hatch-0-c1\)$/);
  });

  it("shows insight text and exact values in the accessible table", () => {
    const { container } = render(<StakeholderMeanPieChart data={stakeholders} />);

    expect(
      screen.getByText(
        /Highest mean: Instructor \(4\.65\)\. Lowest mean: Industry Partner \(3\.86\)\./
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Student (128 responses)")).toBeInTheDocument();
    const exactTable = container.querySelector("table");
    expect(exactTable!.textContent).toContain("4.42");
    expect(exactTable!.textContent).toContain("128");
  });
});

describe("MeanBarChart", () => {
  it("renders a null bar with the muted token and N/A in the exact-value table", () => {
    const { container } = render(
      <MeanBarChart
        title="Mean Attainment by Stakeholder"
        data={[
          { label: "Student", value: 4.42 },
          { label: "Alumni", value: null },
        ]}
      />
    );

    const fills = Array.from(container.querySelectorAll(".recharts-bar-rectangle path")).map(
      (path) => path.getAttribute("fill") ?? ""
    );
    expect(fills).toContain("var(--chart-1)");

    const exactTable = container.querySelector("table");
    expect(exactTable!.textContent).toContain("N/A");
    expect(exactTable!.textContent).toContain("4.42");
    expect(screen.getByText("Student: 4.42.")).toBeInTheDocument();
  });

  it("renders a visible legend with solid and patterned swatches", () => {
    const { container } = render(
      <MeanBarChart
        title="Mean Attainment by Stakeholder"
        data={[
          { label: "Student", value: 4.42 },
          { label: "Alumni", value: null },
          { label: "Industry Partner", value: 3.86 },
          { label: "Instructor", value: 4.65 },
          { label: "Support Staff", value: 3.94 },
          { label: "Graduate Student", value: 4.3 },
        ]}
      />
    );

    const legend = container.querySelector('[aria-label="Chart legend"]');
    expect(legend).not.toBeNull();
    expect(legend!.textContent).toContain("Student");
    expect(legend!.textContent).toContain("Alumni");
    expect(legend!.textContent).toContain("Industry Partner");
    expect(legend!.querySelector("rect[fill^='url(#mean-bar-']")).not.toBeNull();
    expect(legend!.querySelector('[style*="background-color: var(--chart-"]')).not.toBeNull();
    expect(legend!.querySelector('[style*="background-color: var(--muted)"]')).not.toBeNull();
  });

  it("hatches bars beyond five categories with per-instance namespaces", () => {
    const { container } = render(
      <div>
        <MeanBarChart
          title="Mean Attainment by Stakeholder"
          data={[
            { label: "a", value: 4 },
            { label: "b", value: 3 },
            { label: "c", value: 3 },
            { label: "d", value: 3 },
            { label: "e", value: 3 },
            { label: "f", value: 3 },
            { label: "g", value: 3 },
          ]}
        />
        <MeanBarChart
          title="Second Chart"
          data={[
            { label: "a", value: 4 },
            { label: "b", value: 3 },
            { label: "c", value: 3 },
            { label: "d", value: 3 },
            { label: "e", value: 3 },
            { label: "f", value: 3 },
          ]}
        />
      </div>
    );

    const fills = Array.from(container.querySelectorAll(".recharts-bar-rectangle path")).map(
      (path) => path.getAttribute("fill") ?? ""
    );
    expect(fills[5]).toMatch(/^url\(#mean-bar-[A-Za-z0-9_]+-hatch-0-c1\)$/);
    expect(fills[6]).toMatch(/^url\(#mean-bar-[A-Za-z0-9_]+-hatch-1-c1\)$/);

    const chartRegions = document.querySelectorAll('[data-slot="chart"]');
    expect(chartRegions).toHaveLength(2);
    const chartIds = Array.from(chartRegions).map((region) => region.getAttribute("data-chart"));
    expect(new Set(chartIds).size).toBe(2);
    const hatchPatternIds = Array.from(
      document.querySelectorAll('[id^="mean-bar-"][id*="-hatch-"]')
    ).map((pattern) => pattern.id);
    expect(new Set(hatchPatternIds).size).toBe(hatchPatternIds.length);
  });

  it("distinguishes categories beyond ten with a second hatch cycle", () => {
    const { container } = render(
      <MeanBarChart
        title="Mean Attainment by Stakeholder"
        data={Array.from({ length: 12 }, (_, index) => ({
          label: `Category ${index + 1}`,
          value: 3 + (index % 3),
        }))}
      />
    );

    const fills = Array.from(container.querySelectorAll(".recharts-bar-rectangle path")).map(
      (path) => path.getAttribute("fill") ?? ""
    );
    expect(fills[5]).toMatch(/-hatch-0-c1\)$/);
    expect(fills[10]).toMatch(/-hatch-0-c2\)$/);
    expect(fills[11]).toMatch(/-hatch-1-c2\)$/);
    expect(new Set(fills).size).toBe(12);
  });

  it("reports no data when every value is null", () => {
    render(
      <MeanBarChart
        title="Mean Attainment by Stakeholder"
        data={[
          { label: "a", value: null },
          { label: "b", value: null },
        ]}
      />
    );

    expect(screen.getByText("No mean data yet")).toBeInTheDocument();
    expect(screen.getByText("No mean data available.")).toBeInTheDocument();
    expect(document.querySelector(".recharts-surface")).toBeNull();
  });

  it("renders an empty state when data is absent", () => {
    render(<MeanBarChart title="Mean Attainment by Stakeholder" data={[]} />);

    expect(screen.getByText("No mean data yet")).toBeInTheDocument();
    expect(document.querySelector(".recharts-surface")).toBeNull();
  });
});
