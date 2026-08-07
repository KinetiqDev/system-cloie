"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const;

const INITIAL_DIMENSION = { width: 320, height: 200 } as const;

type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
>;

type ChartContextProps = {
  config?: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

/**
 * Approved theme-resolved categorical palette (Chart 1 through Chart 5).
 * Referenced as CSS variables so series resolve per appearance; never as raw hex.
 */
const CHART_TOKENS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

/**
 * Deterministic fill for a category index: cycles the approved five-role
 * palette, then repeats the matching color with a distinct hatch pattern so
 * more than five categories stay distinguishable without expanding the palette.
 * Each palette-repeat cycle rotates and densifies its hatch, so categories
 * beyond ten remain distinguishable too.
 */
export function chartFill(chartId: string, index: number): string {
  if (index < CHART_TOKENS.length) {
    return CHART_TOKENS[index];
  }
  const cycle = Math.floor(index / CHART_TOKENS.length);
  return `url(#${chartId}-hatch-${index % CHART_TOKENS.length}-c${cycle})`;
}

/**
 * One SVG pattern per approved chart token, per repeat cycle. Each pattern
 * references the same theme-resolved token as its base color and adds a
 * deterministic diagonal hatch; later cycles alternate hatch direction and
 * keep strictly decreasing spacing, so every category count receives a
 * distinct mark-level treatment without expanding the palette.
 */
export function ChartPatternDefs({
  chartId,
  categoryCount,
}: {
  chartId: string;
  categoryCount: number;
}) {
  const cycles = Math.max(0, Math.ceil(categoryCount / CHART_TOKENS.length) - 1);

  return (
    <defs>
      {Array.from({ length: cycles + 1 }, (_, cycle) =>
        CHART_TOKENS.map((token, index) => {
          const spacing = 6 / (cycle + 1);
          return (
            <pattern
              key={`${token}-c${cycle}`}
              id={`${chartId}-hatch-${index}-c${cycle}`}
              width={spacing}
              height={spacing}
              patternUnits="userSpaceOnUse"
              patternTransform={`rotate(${cycle % 2 === 0 ? 45 : -45})`}
            >
              <rect width={spacing} height={spacing} fill={token} fillOpacity="0.22" />
              <path
                d={`M 0,0 L ${spacing},${spacing}`}
                stroke={token}
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </pattern>
          );
        })
      )}
    </defs>
  );
}

/**
 * Legend marker for a series fill: renders the hatch pattern itself for
 * pattern fills and a plain color swatch otherwise, so repeated colors stay
 * identifiable in legends too.
 */
export function ChartSwatch({ fill }: { fill: string }) {
  if (fill.startsWith("url(")) {
    return (
      <svg className="h-2 w-2 shrink-0" aria-hidden="true">
        <rect width="8" height="8" fill={fill} />
      </svg>
    );
  }
  return <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: fill }} />;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  initialDimension = INITIAL_DIMENSION,
  ...props
}: React.ComponentProps<"div"> & {
  config?: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
  initialDimension?: {
    width: number;
    height: number;
  };
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer initialDimension={initialDimension}>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartStyle = ({ id, config }: { id: string; config?: ChartConfig }) => {
  const colorConfig = config
    ? Object.entries(config).filter(([, itemConfig]) => itemConfig.theme ?? itemConfig.color)
    : [];

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ?? itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: React.ComponentProps<"div"> & {
  hideIcon?: boolean;
  nameKey?: string;
} & RechartsPrimitive.DefaultLegendContentProps) {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
    >
      {payload
        .filter((item) => item.type !== "none")
        .map((item, index) => (
          <ChartLegendItem
            key={index}
            item={item}
            config={config}
            nameKey={nameKey}
            hideIcon={hideIcon}
          />
        ))}
    </div>
  );
}

function ChartLegendItem({
  item,
  config,
  nameKey,
  hideIcon,
}: {
  item: NonNullable<RechartsPrimitive.DefaultLegendContentProps["payload"]>[number];
  config?: ChartConfig;
  nameKey?: string;
  hideIcon: boolean;
}) {
  const key = `${nameKey ?? item.dataKey ?? "value"}`;
  const itemConfig = config ? getPayloadConfigFromPayload(config, item, key) : undefined;

  return (
    <div className="[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3">
      <ChartLegendMarker itemConfig={itemConfig} item={item} hideIcon={hideIcon} />
      {itemConfig?.label ?? String(item.value ?? item.dataKey)}
    </div>
  );
}

function ChartLegendMarker({
  itemConfig,
  item,
  hideIcon,
}: {
  itemConfig?: ChartConfig[string];
  item: NonNullable<RechartsPrimitive.DefaultLegendContentProps["payload"]>[number];
  hideIcon: boolean;
}) {
  if (itemConfig?.icon && !hideIcon) {
    return <itemConfig.icon />;
  }
  if (!item.color) {
    return null;
  }
  return <ChartSwatch fill={item.color} />;
}

function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const inner = record.payload;
  const innerValue =
    typeof inner === "object" && inner !== null
      ? (inner as Record<string, unknown>)[key]
      : undefined;
  const raw = typeof record[key] === "string" ? record[key] : innerValue;
  const labelKey = typeof raw === "string" ? raw : key;

  return labelKey in config ? config[labelKey] : config[key];
}

export { ChartContainer, ChartTooltip, ChartLegend, ChartLegendContent };
