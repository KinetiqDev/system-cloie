import type { ReactNode } from "react";
import Link from "next/link";
import { ClipboardList, Inbox } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import type { OutcomeScaleDistributionDTO } from "@/features/analytics/outcome-evidence-types";
import type {
  GeneralEducationAnalyticsEmptyReason,
  GeneralEducationScaleGroupDTO,
} from "@/features/analytics/general-education-analytics-types";

/**
 * Mean rating with an exact, bounded presentation. Full precision lives in the
 * DTO; the browser only ever rounds for display.
 */
export function formatMean(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}

/** Response rate as a percentage, or unavailable when there are no opportunities. */
export function formatResponseRate(rate: number | null): string {
  return rate === null ? "—" : `${(rate * 100).toFixed(1)}%`;
}

/** Mean plus its signed change against the previous comparable period. */
export function formatChange(change: number): string {
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}`;
}

/**
 * A count with its noun, pluralized once for every surface. Counts and their
 * nouns always travel together here, so a chart tooltip, a legend, and a table
 * cell cannot disagree about whether a single rating reads as "ratings".
 */
export function countedNoun(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Semantic identity of one frozen rating scale.
 *
 * Two scales are the same scale only when their descriptor sets match value
 * for value, label for label. The readable `scaleLabel` is presentation, so
 * grouping on it would silently merge two genuinely different instrument
 * scales that happen to print the same range. Values and labels are arbitrary
 * strings, so the identity is structurally encoded rather than joined with a
 * separator — the same rule `question-identity` follows.
 */
export function scaleIdentityKey(distribution: OutcomeScaleDistributionDTO): string {
  const categories = distribution.categories
    .map((category) => [category.value, category.label ?? ""])
    .sort((left, right) => Number(left[0]) - Number(right[0]));
  return JSON.stringify([distribution.maxValue, categories]);
}

/**
 * Scale-separated mean series for a set of rows. Two scales never share a chart,
 * so no reader can compare a 1–4 mean against a 1–5 mean by bar length.
 */
export function buildScaleSeries<
  T extends {
    scaleGroups: GeneralEducationScaleGroupDTO[];
  },
>(
  rows: T[],
  toDatum: (
    row: T,
    scale: GeneralEducationScaleGroupDTO
  ) => {
    key: string;
    label: string;
    meanRating: number | null;
    ratingCount: number;
    submittedResponseCount: number;
    context?: string | null;
    links?: Array<{ href: string; label: string }>;
  }
) {
  const byScaleKey = new Map<
    string,
    {
      key: string;
      scaleLabel: string;
      maxValue: number;
      minValue: number;
      means: Array<{ mean: number | null; row: T; scale: GeneralEducationScaleGroupDTO }>;
    }
  >();

  for (const row of rows) {
    for (const scale of row.scaleGroups) {
      // `scaleKey` is the semantic identity the service resolves. When it is
      // absent, the structural descriptor tuple still distinguishes two scales
      // that merely print the same readable label.
      const key = scale.scaleKey || scaleIdentityKey(scale.distribution);
      let entry = byScaleKey.get(key);
      if (!entry) {
        entry = {
          key,
          scaleLabel: scale.scaleLabel,
          maxValue: maxScaleValue(scale.distribution),
          minValue: minScaleValue(scale.distribution),
          means: [],
        };
        byScaleKey.set(key, entry);
      }
      entry.means.push({ mean: scale.meanRating, row, scale });
    }
  }

  return [...byScaleKey.values()]
    .map((entry) => ({
      key: entry.key,
      scaleLabel: entry.scaleLabel,
      maxValue: entry.maxValue,
      minValue: entry.minValue,
      rows: entry.means.map(({ row, scale }) => toDatum(row, scale)),
      meanOfMeans: entry.means.every((entry_) => entry_.mean !== null)
        ? entry.means.reduce((sum, entry_) => sum + (entry_.mean ?? 0), 0) / entry.means.length
        : null,
    }))
    .sort((left, right) => (right.meanOfMeans ?? -Infinity) - (left.meanOfMeans ?? -Infinity));
}

function maxScaleValue(distribution: OutcomeScaleDistributionDTO): number {
  const values = distribution.categories.map((category) => category.value);
  return values.length === 0 ? 5 : Math.max(...values, distribution.maxValue);
}

function minScaleValue(distribution: OutcomeScaleDistributionDTO): number {
  const values = distribution.categories.map((category) => category.value);
  return values.length === 0 ? 1 : Math.min(...values);
}

/** Shared empty-state copy so every view explains absence the same way. */
export function emptyScopeCopy(emptyReason: GeneralEducationAnalyticsEmptyReason): {
  title: string;
  description: string;
} | null {
  if (emptyReason === "no-assignments") {
    return {
      title: "No evaluation assignments",
      description:
        "No General Education course has an evaluation assignment in this scope, so no evidence can be reported.",
    };
  }
  if (emptyReason === "no-submissions") {
    return {
      title: "No submitted responses",
      description:
        "General Education evaluation assignments exist in this scope, but no responses have been submitted yet.",
    };
  }
  return null;
}

type SectionShellProps = {
  id: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
};

/** One analytics section: 24px separation, heading then content. */
export function SectionShell({ id, title, description, action, children }: SectionShellProps) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={id} className="text-heading-lg text-foreground text-balance">
            {title}
          </h2>
          {description ? (
            <p className="text-body-sm text-text-secondary max-w-3xl text-pretty">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * Scope-level empty state, shared by every Coordinator view so absence reads
 * the same way everywhere: icon, cause, and the one recovery action.
 */
export function ScopeEmptyState({
  title,
  description,
  resetHref,
  resetLabel = "View all periods",
}: {
  title: string;
  description: string;
  resetHref: string;
  resetLabel?: string;
}) {
  const Icon = title === "No evaluation assignments" ? ClipboardList : Inbox;
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link href={resetHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          {resetLabel}
        </Link>
      </EmptyContent>
    </Empty>
  );
}
