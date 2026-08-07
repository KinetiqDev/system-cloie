import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CourseMeanPieChart } from "@/features/analytics/components/course-mean-pie-chart";
import { StakeholderMeanPieChart } from "@/features/analytics/components/stakeholder-mean-pie-chart";
import { FacultyCiloAnalyticsChart } from "@/features/analytics/components/faculty-cilo-analytics-chart";
import { MeanBarChart } from "@/features/analytics/components/mean-bar-chart";
import type { FacultyAnalyticsData } from "@/features/analytics/types";

function sectorFills(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll(".recharts-pie-sector path")).map(
    (path) => path.getAttribute("fill") ?? ""
  );
}

describe("CourseMeanPieChart", () => {
  const courses = [
    { courseCode: "CS101", courseTitle: "Intro to CS", mean: 4.42, responseCount: 42 },
    { courseCode: "CS201", courseTitle: "Data Structures", mean: 4.18, responseCount: 37 },
    { courseCode: "CS301", courseTitle: "Operating Systems", mean: 3.86, responseCount: 29 },
    { courseCode: "MATH101", courseTitle: "Calculus", mean: 4.65, responseCount: 31 },
    { courseCode: "PHYS101", courseTitle: "Physics", mean: 3.94, responseCount: 24 },
    { courseCode: "ENG101", courseTitle: "Technical Writing", mean: 4.3, responseCount: 19 },
  ];

  it("renders a distinct empty state when no course data exists", () => {
    render(<CourseMeanPieChart data={[]} />);

    expect(screen.getByText("No course data yet")).toBeInTheDocument();
    expect(screen.getByText("No quantitative response data available yet.")).toBeInTheDocument();
  });

  it("resolves fills from semantic tokens and hatches categories beyond five", () => {
    const { container } = render(<CourseMeanPieChart data={courses} />);

    const fills = sectorFills(container);
    expect(fills.slice(0, 5)).toEqual([
      "var(--chart-1)",
      "var(--chart-2)",
      "var(--chart-3)",
      "var(--chart-4)",
      "var(--chart-5)",
    ]);
    expect(fills[5]).toMatch(/^url\(#course-mean-[A-Za-z0-9_]+-hatch-0-c1\)$/);
    expect(container.querySelector('[id^="course-mean-"][id$="-hatch-0-c1"]')).not.toBeNull();
  });

  it("names the chart region from its title and insight", () => {
    render(<CourseMeanPieChart data={courses} />);

    const region = screen.getByRole("region", { name: "Overall Mean by Course" });
    expect(region).toBeInTheDocument();
    expect(region.getAttribute("aria-describedby")).not.toBeNull();
    expect(document.getElementById(region.getAttribute("aria-describedby")!)!.textContent).toMatch(
      /Highest mean: MATH101/
    );
  });

  it("namespaces ids per instance so two charts stay distinct", () => {
    const { container } = render(
      <div>
        <CourseMeanPieChart data={courses.slice(0, 3)} />
        <CourseMeanPieChart data={courses.slice(3)} />
      </div>
    );

    const regions = Array.from(container.querySelectorAll('[data-slot="chart"]'));
    expect(regions).toHaveLength(2);
    expect(new Set(regions.map((region) => region.getAttribute("data-chart"))).size).toBe(2);
    const patternIds = Array.from(
      container.querySelectorAll('[id*="course-mean-"][id*="-hatch-"]')
    ).map((pattern) => pattern.id);
    expect(new Set(patternIds).size).toBe(patternIds.length);
  });

  it("shows direct labels, a legend with response counts, insight, and exact values", () => {
    const { container } = render(<CourseMeanPieChart data={courses} />);

    expect(screen.getByText("CS101: 4.42")).toBeInTheDocument();
    expect(screen.getByText("CS101 — Intro to CS (42 responses)")).toBeInTheDocument();
    expect(
      screen.getByText(/Highest mean: MATH101 \(4\.65\)\. Lowest mean: CS301 \(3\.86\)\./)
    ).toBeInTheDocument();
    expect(screen.getByText("View exact values")).toBeInTheDocument();

    const exactTable = container.querySelector("table");
    expect(exactTable).not.toBeNull();
    expect(exactTable!.textContent).toContain("CS101");
    expect(exactTable!.textContent).toContain("4.42");
    expect(exactTable!.textContent).toContain("42");
  });
});

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

describe("FacultyCiloAnalyticsChart", () => {
  const baseEval: FacultyAnalyticsData = {
    evaluationId: "e1",
    deploymentName: "Deployment",
    courseTitle: "Course",
    programName: "Program",
    termInstanceLabel: "2025-2026",
    status: "ACTIVE",
    overallMean: 4.2,
    responseCount: 10,
    totalAssignments: 10,
    qualitativeItemCount: 0,
    ciloMetrics: [],
    quantitativeQuestions: [],
    wordCloudTokens: [],
  };

  const data: FacultyAnalyticsData[] = [
    {
      ...baseEval,
      ciloMetrics: [
        {
          ciloId: "c1",
          ciloLabel: "Analyze problems",
          ciloDescription: "Applies analysis",
          bindingId: "b1",
          mean: 4.5,
          responseCount: 2,
        },
        {
          ciloId: "c2",
          ciloLabel: "Design solutions",
          ciloDescription: "Creates designs",
          bindingId: "b2",
          mean: 3.0,
          responseCount: 1,
        },
        {
          ciloId: "c3",
          ciloLabel: "Communicate results",
          ciloDescription: "Writes reports",
          bindingId: "b3",
          mean: 4.0,
          responseCount: 1,
        },
        {
          ciloId: "c4",
          ciloLabel: "Work in teams",
          ciloDescription: "Collaborates",
          bindingId: "b4",
          mean: 3.5,
          responseCount: 1,
        },
        {
          ciloId: "c5",
          ciloLabel: "Ethical practice",
          ciloDescription: "Applies ethics",
          bindingId: "b5",
          mean: 4.2,
          responseCount: 1,
        },
        {
          ciloId: "c6",
          ciloLabel: "Critical thinking",
          ciloDescription: "Evaluates",
          bindingId: "b6",
          mean: 3.8,
          responseCount: 1,
        },
      ],
    },
  ];

  it("renders an empty state when no CILO data exists", () => {
    render(<FacultyCiloAnalyticsChart data={[{ ...baseEval, ciloMetrics: [] }]} />);

    expect(screen.getByText("No CILO data yet")).toBeInTheDocument();
  });

  it("aggregates, resolves semantic fills, and hatches beyond five categories", () => {
    const { container } = render(<FacultyCiloAnalyticsChart data={data} />);

    const fills = sectorFills(container);
    expect(fills[0]).toBe("var(--chart-1)");
    expect(fills[5]).toMatch(/^url\(#cilo-mean-[A-Za-z0-9_]+-hatch-0-c1\)$/);
    expect(screen.getByText("Analyze problems: 4.5")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Highest attainment: Analyze problems \(4\.5\)\. Lowest attainment: Design solutions \(3\)\./
      )
    ).toBeInTheDocument();
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
