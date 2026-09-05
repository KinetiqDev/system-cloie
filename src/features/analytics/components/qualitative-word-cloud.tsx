"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, Cloud, ListOrdered } from "lucide-react";
import type { WordCloudConfig } from "@isoterik/react-word-cloud";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import type { WordCloudToken } from "@/features/analytics/types";

type QualitativeWordCloudProps = {
  title: string;
  tokens: WordCloudToken[];
  /**
   * Number of qualitative answers the tokens were aggregated from — items,
   * not submitted responses, so the count matches what the cloud actually
   * counts.
   */
  answerCount: number;
};

type TermView = "ranked" | "cloud";

const MAX_WIDTH = 960;
const MIN_HEIGHT = 220;
const MAX_HEIGHT = 420;
/** Frame padding mirrors the `p-3` on the shared frame so both views match. */
const FRAME_PADDING = 12;
/** Initial density uses a reachable native range value. */
const DEFAULT_CLOUD_TERMS = 30;
/** Slider bounds: the cloud never renders fewer than 10 or more than 70 words. */
const MIN_CLOUD_TERMS = 10;
const MAX_CLOUD_TERMS = 70;
const CLOUD_TERM_STEP = 1;
/** Terms that repeat (count >= 2) rank; singletons collapse into one row. */
const SINGLETON_GROUP_MIN = 5;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildDimensions(containerWidth: number): Pick<WordCloudConfig, "height" | "width"> {
  // The container governs the width; 280/960 only bound the extremes.
  const width = clamp(containerWidth, 1, MAX_WIDTH);
  const height = clamp(Math.round(width * 0.55), MIN_HEIGHT, MAX_HEIGHT);
  return { height, width };
}

/**
 * Font scale resolves over the full token list, not the rendered slice, so a
 * term keeps one size no matter how many words the canvas shows.
 */
function buildFontSize(tokens: WordCloudToken[]) {
  if (tokens.length === 0) return () => 28;
  // Tokens arrive sorted by frequency; the bounds are the outermost entries.
  const minimum = tokens[tokens.length - 1]!.value;
  const maximum = tokens[0]!.value;
  return (word: WordCloudToken) => {
    if (minimum === maximum) return 28;
    const normalized =
      (Math.sqrt(word.value) - Math.sqrt(minimum)) / (Math.sqrt(maximum) - Math.sqrt(minimum));
    return 16 + clamp(normalized, 0, 1) * 32;
  };
}

/**
 * Solid cycling of the approved five chart tokens gives the cloud its color
 * variety. Every token resolves to >= 4.5:1 on the card surface in both
 * themes, hatching stays out of text, and no legend or status depends on the
 * color.
 */
const CHART_INKS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

function wordFill(_word: WordCloudToken, index: number): string {
  return CHART_INKS[index % CHART_INKS.length];
}

// A module-level identity keeps the cloud layout stable across renders.
const NO_ROTATION = () => 0;

/** Client-side `prefers-reduced-motion` resolution, defaults to motion allowed. */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window.matchMedia !== "function") {
        return () => undefined;
      }
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", onStoreChange);
      return () => query.removeEventListener("change", onStoreChange);
    },
    () =>
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false // server snapshot: allow motion
  );
}

const WordCloud = dynamic(() => import("@isoterik/react-word-cloud").then((m) => m.WordCloud), {
  ssr: false,
  loading: () => null,
});

function RankedValues({ tokens, frameHeight }: { tokens: WordCloudToken[]; frameHeight: number }) {
  const ranked = useMemo(() => tokens.filter((token) => token.value > 1), [tokens]);
  const singletons = useMemo(() => tokens.filter((token) => token.value === 1), [tokens]);
  const groupSingletons = singletons.length >= SINGLETON_GROUP_MIN;
  const topValue = ranked[0]?.value ?? 1;

  return (
    <div className="flex min-h-0 flex-col" style={{ height: frameHeight }}>
      <Table
        aria-label="Exact word frequency values"
        containerClassName="min-h-0 flex-1 overflow-y-auto"
      >
        <TableHeader className="bg-card sticky top-0 z-10">
          <TableRow>
            <TableHead>Term</TableHead>
            <TableHead className="w-20 sm:w-32">Distribution</TableHead>
            <TableHead className="text-right">Mentions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ranked.map((token) => (
            <TableRow key={token.text}>
              <TableCell className="max-w-40 min-w-0 font-medium break-words sm:max-w-none">
                {token.text}
              </TableCell>
              <TableCell>
                <div aria-hidden="true" className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-chart-1 h-full rounded-full"
                    style={{ width: `${Math.round((token.value / topValue) * 100)}%` }}
                  />
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{token.value}</TableCell>
            </TableRow>
          ))}
          {groupSingletons && singletons.length > 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="whitespace-normal">
                <details className="group">
                  <summary className="text-label-md text-foreground flex cursor-pointer list-none items-center gap-1.5 font-medium pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden">
                    {singletons.length} {singletons.length === 1 ? "term" : "terms"} mentioned once
                    <ChevronDown
                      aria-hidden="true"
                      className="text-muted-foreground size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                    />
                  </summary>
                  <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Terms mentioned once">
                    {singletons.map((token) => (
                      <li
                        key={token.text}
                        className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-xs"
                      >
                        {token.text}
                      </li>
                    ))}
                  </ul>
                </details>
              </TableCell>
            </TableRow>
          ) : null}
          {!groupSingletons &&
            singletons.map((token) => (
              <TableRow key={token.text}>
                <TableCell className="font-medium">{token.text}</TableCell>
                <TableCell>
                  <div aria-hidden="true" className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className="bg-chart-1 h-full rounded-full"
                      style={{ width: `${Math.round((token.value / topValue) * 100)}%` }}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{token.value}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function QualitativeWordCloud({ title, tokens, answerCount }: QualitativeWordCloudProps) {
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `word-cloud-${instanceId}`;
  const titleId = `${chartId}-title`;
  const insightId = `${chartId}-insight`;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [view, setView] = useState<TermView>("cloud");
  const [wordCount, setWordCount] = useState(DEFAULT_CLOUD_TERMS);
  const [dimensions, setDimensions] = useState<Pick<WordCloudConfig, "height" | "width">>({
    height: 320,
    width: 360,
  });
  const sortedTokens = useMemo(
    () =>
      [...tokens].sort((left, right) =>
        left.value === right.value ? left.text.localeCompare(right.text) : right.value - left.value
      ),
    [tokens]
  );
  const hasTokens = tokens.length > 0;
  // Keep native range constraints valid even when fewer than ten tokens exist.
  const cloudCap = Math.min(MAX_CLOUD_TERMS, sortedTokens.length);
  const cloudFloor = Math.min(MIN_CLOUD_TERMS, cloudCap);
  const cloudTermCount = Math.min(wordCount, cloudCap);
  const cloudTokens = useMemo(
    () => sortedTokens.slice(0, cloudTermCount),
    [sortedTokens, cloudTermCount]
  );
  const fontSize = useMemo(() => buildFontSize(sortedTokens), [sortedTokens]);
  const repeatedCount = useMemo(
    () => sortedTokens.filter((token) => token.value > 1).length,
    [sortedTokens]
  );

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    if (typeof ResizeObserver === "undefined") {
      setDimensions(buildDimensions(containerRef.current.clientWidth));
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      setDimensions((current) => {
        const next = buildDimensions(entry.contentRect.width);
        return current.width === next.width && current.height === next.height ? current : next;
      });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [hasTokens]);

  if (!hasTokens) {
    return (
      <Card>
        <CardHeader>
          <CardTitle id={titleId} className="text-title-sm">
            {title}
          </CardTitle>
          <CardDescription>Frequent words from qualitative feedback</CardDescription>
        </CardHeader>
        <CardContent>
          <Empty className="h-64">
            <EmptyTitle>No qualitative responses yet</EmptyTitle>
            <EmptyDescription>No qualitative response data available yet.</EmptyDescription>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  const topToken = sortedTokens[0];
  const summary = `${sortedTokens.length} terms from ${answerCount} qualitative ${
    answerCount === 1 ? "answer" : "answers"
  }`;
  const insight = `Most frequent term: ${topToken.text} (${topToken.value}). ${repeatedCount} of ${sortedTokens.length} terms appear more than once.`;
  const cloudLabel = `Word cloud of the most frequent terms. Most frequent: ${topToken.text} (${topToken.value}). Switch to the Ranked view for exact counts.`;

  return (
    <Card>
      <CardHeader>
        <CardTitle id={titleId} className="text-title-sm">
          {title}
        </CardTitle>
        <CardDescription>{summary}</CardDescription>
        <CardAction>
          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
            {view === "cloud" ? (
              <label className="text-label-sm text-muted-foreground flex items-center gap-2 font-medium">
                <span className="hidden sm:inline">Words shown</span>
                <input
                  type="range"
                  min={cloudFloor}
                  max={cloudCap}
                  step={CLOUD_TERM_STEP}
                  value={cloudTermCount}
                  onChange={(event) => setWordCount(event.currentTarget.valueAsNumber)}
                  disabled={cloudCap === cloudFloor}
                  aria-label={`Words shown in the cloud: ${cloudTermCount}`}
                  aria-valuetext={`${cloudTermCount} words`}
                  className="accent-primary min-h-11 w-24 cursor-pointer disabled:cursor-not-allowed sm:w-32"
                />
                <output className="text-foreground w-12 tabular-nums">{cloudTermCount}</output>
              </label>
            ) : null}
            <ToggleGroup
              aria-label="Term frequency view"
              role="toolbar"
              spacing={0}
              value={[view]}
              variant="outline"
              onValueChange={(nextValues: string[]) => {
                const nextView = nextValues[0];
                if ((nextView !== "cloud" && nextView !== "ranked") || nextView === view) return;
                setView(nextView);
              }}
            >
              <ToggleGroupItem
                className="pointer-coarse:h-11 pointer-coarse:min-w-11"
                value="ranked"
              >
                <ListOrdered data-icon="inline-start" aria-hidden="true" />
                Ranked
              </ToggleGroupItem>
              <ToggleGroupItem
                className="pointer-coarse:h-11 pointer-coarse:min-w-11"
                value="cloud"
              >
                <Cloud data-icon="inline-start" aria-hidden="true" />
                Cloud
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div
          ref={containerRef}
          role="region"
          aria-labelledby={titleId}
          aria-describedby={insightId}
          className="border-border rounded-xl border p-3 select-none"
          style={{ height: dimensions.height + FRAME_PADDING * 2 }}
        >
          {view === "cloud" ? (
            <div
              role="img"
              aria-label={cloudLabel}
              className="flex h-full w-full items-center justify-center"
            >
              <WordCloud
                words={cloudTokens}
                width={dimensions.width}
                height={dimensions.height}
                font="Inter, ui-sans-serif, system-ui, sans-serif"
                fill={wordFill}
                fontSize={fontSize}
                rotate={NO_ROTATION}
                enableTooltip
                svgProps={{
                  width: "100%",
                  height: "100%",
                  preserveAspectRatio: "xMidYMid meet",
                }}
                transition={prefersReducedMotion ? "none" : "opacity 200ms ease"}
              />
            </div>
          ) : (
            <RankedValues tokens={sortedTokens} frameHeight={dimensions.height} />
          )}
        </div>
        <p id={insightId} className="text-body-sm text-text-secondary">
          {insight}
        </p>
      </CardContent>
    </Card>
  );
}
