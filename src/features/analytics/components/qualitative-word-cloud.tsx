"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { WordCloud } from "@isoterik/react-word-cloud";
import type { WordCloudConfig } from "@isoterik/react-word-cloud";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartPatternDefs, chartFill } from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { WordCloudToken } from "@/features/analytics/types";

type QualitativeWordCloudProps = {
  title: string;
  tokens: WordCloudToken[];
  /** Number of qualitative responses the tokens were aggregated from. */
  responseCount: number;
  adjustable?: boolean;
};

const MIN_WIDTH = 280;
const MAX_WIDTH = 960;
const MIN_HEIGHT = 220;
const MAX_HEIGHT = 420;
const MIN_VISIBLE_WORDS = 10;
const DEFAULT_VISIBLE_WORDS = 30;
const WORD_STEP = 5;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildDimensions(containerWidth: number): Pick<WordCloudConfig, "height" | "width"> {
  const width = clamp(containerWidth, MIN_WIDTH, MAX_WIDTH);
  const height = clamp(Math.round(width * 0.55), MIN_HEIGHT, MAX_HEIGHT);
  return { height, width };
}

function buildFontSize(tokens: WordCloudToken[]) {
  const values = tokens.map((token) => token.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  return (word: WordCloudToken) => {
    if (minimum === maximum) return 28;
    const normalized =
      (Math.sqrt(word.value) - Math.sqrt(minimum)) / (Math.sqrt(maximum) - Math.sqrt(minimum));
    return 16 + normalized * 32;
  };
}

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

export function QualitativeWordCloud({
  title,
  tokens,
  responseCount,
  adjustable = false,
}: QualitativeWordCloudProps) {
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `word-cloud-${instanceId}`;
  const titleId = `${chartId}-title`;
  const insightId = `${chartId}-insight`;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [dimensions, setDimensions] = useState<Pick<WordCloudConfig, "height" | "width">>({
    height: 320,
    width: 360,
  });
  const [visibleWordCount, setVisibleWordCount] = useState(DEFAULT_VISIBLE_WORDS);
  const minimumWordCount = Math.min(MIN_VISIBLE_WORDS, tokens.length);
  const maximumWordCount = tokens.length;
  const renderedTokens = adjustable ? tokens.slice(0, visibleWordCount) : tokens;
  const fontSize = buildFontSize(renderedTokens);

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

      setDimensions(buildDimensions(entry.contentRect.width));
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (tokens.length === 0) {
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

  const totalOccurrences = renderedTokens.reduce((sum, token) => sum + token.value, 0);
  const topToken = renderedTokens[0];
  const summary = `Top ${renderedTokens.length} words from ${responseCount} qualitative ${
    responseCount === 1 ? "response" : "responses"
  }`;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle id={titleId} className="text-title-sm">
              {title}
            </CardTitle>
            <CardDescription>{summary}</CardDescription>
          </div>
          {adjustable ? (
            <label className="text-label-sm text-muted-foreground flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 font-semibold">
              <span>Words shown</span>
              <input
                type="range"
                min={minimumWordCount}
                max={maximumWordCount}
                step={WORD_STEP}
                value={Math.min(visibleWordCount, maximumWordCount)}
                onChange={(event) => setVisibleWordCount(Number(event.target.value))}
                disabled={minimumWordCount === maximumWordCount}
                aria-label={`Number of top words shown: ${renderedTokens.length}`}
                className="accent-primary min-h-11 min-w-32 flex-1 cursor-pointer disabled:cursor-not-allowed sm:w-40 sm:flex-none"
              />
              <output className="text-foreground min-w-16 tabular-nums">
                {renderedTokens.length} words
              </output>
            </label>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div
          role="region"
          aria-labelledby={titleId}
          aria-describedby={insightId}
          className="border-border rounded-xl border p-3"
        >
          <svg aria-hidden="true" className="absolute h-0 w-0">
            <ChartPatternDefs chartId={chartId} categoryCount={renderedTokens.length} />
          </svg>
          <div ref={containerRef} className="flex w-full justify-center">
            <WordCloud
              words={renderedTokens}
              width={dimensions.width}
              height={dimensions.height}
              font="ui-sans-serif, system-ui, sans-serif"
              fill={(_word, index) => chartFill(chartId, index)}
              fontSize={fontSize}
              rotate={() => 0}
              enableTooltip
              transition={prefersReducedMotion ? "none" : "opacity 200ms ease"}
            />
          </div>
        </div>
        <p id={insightId} className="text-body-sm text-text-secondary">
          Most frequent word: {topToken.text} ({topToken.value}).
        </p>
        <details>
          <summary className="text-label-sm text-text-secondary cursor-pointer">
            View exact values
          </summary>
          <div className="border-border mt-3 overflow-x-auto rounded-lg border">
            <Table aria-label="Exact word frequency values">
              <TableHeader>
                <TableRow>
                  <TableHead>Word</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderedTokens.map((token) => (
                  <TableRow key={token.text}>
                    <TableCell className="font-medium">{token.text}</TableCell>
                    <TableCell className="text-right tabular-nums">{token.value}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {((token.value / totalOccurrences) * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
