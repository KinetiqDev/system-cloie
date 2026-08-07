import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Bar, BarChart } from "recharts";
import {
  ChartContainer,
  ChartLegendContent,
  ChartPatternDefs,
  chartFill,
} from "@/components/ui/chart";

describe("chartFill", () => {
  it("resolves the first five categories to the approved chart tokens", () => {
    expect(chartFill("test", 0)).toBe("var(--chart-1)");
    expect(chartFill("test", 1)).toBe("var(--chart-2)");
    expect(chartFill("test", 4)).toBe("var(--chart-5)");
  });

  it("repeats colors with a deterministic cycle-aware hatch url beyond five categories", () => {
    expect(chartFill("test", 5)).toBe("url(#test-hatch-0-c1)");
    expect(chartFill("test", 6)).toBe("url(#test-hatch-1-c1)");
    expect(chartFill("test", 9)).toBe("url(#test-hatch-4-c1)");
    expect(chartFill("test", 10)).toBe("url(#test-hatch-0-c2)");
    expect(chartFill("test", 14)).toBe("url(#test-hatch-4-c2)");
    expect(chartFill("test", 15)).toBe("url(#test-hatch-0-c3)");
    expect(chartFill("a", 5)).toBe("url(#a-hatch-0-c1)");
    expect(chartFill("b", 5)).toBe("url(#b-hatch-0-c1)");
  });
});

describe("ChartPatternDefs", () => {
  it("defines one hatch pattern per approved chart token per repeat cycle", () => {
    render(
      <svg>
        <ChartPatternDefs chartId="demo" categoryCount={7} />
      </svg>
    );

    const cycleZero = document.querySelectorAll(
      "#demo-hatch-0-c0, #demo-hatch-1-c0, #demo-hatch-2-c0, #demo-hatch-3-c0, #demo-hatch-4-c0"
    );
    expect(cycleZero).toHaveLength(5);
    const cycleOne = document.querySelectorAll(
      "#demo-hatch-0-c1, #demo-hatch-1-c1, #demo-hatch-2-c1, #demo-hatch-3-c1, #demo-hatch-4-c1"
    );
    expect(cycleOne).toHaveLength(5);
  });

  it("keeps pattern colors token-derived across cycles", () => {
    render(
      <svg>
        <ChartPatternDefs chartId="demo" categoryCount={12} />
      </svg>
    );

    const rects = Array.from(
      document.querySelectorAll(
        "#demo-hatch-0-c0 rect, #demo-hatch-0-c1 rect, #demo-hatch-0-c2 rect"
      )
    );
    expect(rects.map((rect) => rect.getAttribute("fill"))).toEqual([
      "var(--chart-1)",
      "var(--chart-1)",
      "var(--chart-1)",
    ]);
  });

  it("keeps hatch geometry distinct across every repeat cycle", () => {
    render(
      <svg>
        <ChartPatternDefs chartId="demo" categoryCount={26} />
      </svg>
    );

    const widths = Array.from(document.querySelectorAll('[id^="demo-hatch-0-c"]')).map((pattern) =>
      pattern.getAttribute("width")
    );
    expect(widths).toHaveLength(6);
    expect(new Set(widths).size).toBe(6);
  });
});

describe("ChartContainer", () => {
  it("assigns a deterministic chart id and renders children", () => {
    render(
      <ChartContainer id="foo" config={{}} className="aspect-auto h-80 w-full">
        <BarChart data={[{ label: "a", value: 1 }]}>
          <Bar dataKey="value" />
        </BarChart>
      </ChartContainer>
    );

    expect(document.querySelector('[data-slot="chart"]')).toHaveAttribute(
      "data-chart",
      "chart-foo"
    );
  });

  it("throws when tooltip content is rendered outside a container", () => {
    expect(() => render(<ChartLegendContent payload={[]} />)).toThrow(
      "useChart must be used within a"
    );
  });
});

describe("ChartLegendContent", () => {
  it("renders a pattern swatch for url fills and a color swatch otherwise", () => {
    render(
      <svg>
        <ChartPatternDefs chartId="legend-test" categoryCount={7} />
      </svg>
    );
    const { container } = render(
      <ChartContainer id="legend" config={{}}>
        <ChartLegendContent
          payload={[
            { value: "a", color: "url(#legend-test-hatch-0-c1)", dataKey: "a" },
            { value: "b", color: "var(--chart-2)", dataKey: "b" },
          ]}
        />
      </ChartContainer>
    );

    const urlSwatch = container.querySelector("svg rect[fill='url(#legend-test-hatch-0-c1)']");
    expect(urlSwatch).not.toBeNull();
    const colorSwatch = container.querySelector('[style*="background-color: var(--chart-2)"]');
    expect(colorSwatch).not.toBeNull();
  });

  it("falls back to the entry value when no config label exists", () => {
    render(
      <ChartContainer id="legend" config={{}}>
        <ChartLegendContent
          payload={[{ value: "Student", color: "var(--chart-1)", dataKey: "mean" }]}
        />
      </ChartContainer>
    );

    expect(screen.getByText("Student")).toBeInTheDocument();
  });
});
