import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type StatTab = "pending" | "in-progress" | "submitted";

interface StatCardsProps {
  /** Evaluations awaiting a first answer. Never includes drafts. */
  pending: number;
  /** Evaluations with a saved, unsubmitted draft. */
  inProgress: number;
  completed: number;
  /**
   * Evaluations route each tile links to, with its own status tab selected.
   * Empty when evaluations cannot be reached yet (deferred enrollment): the
   * route redirects back here, so the tiles stay plain counts instead of links.
   */
  evaluationsHref: string;
}

const STATS: ReadonlyArray<{ label: string; tab: StatTab; valueClass: string }> = [
  { label: "Pending", tab: "pending", valueClass: "text-link" },
  { label: "In Progress", tab: "in-progress", valueClass: "text-text-secondary" },
  { label: "Completed", tab: "submitted", valueClass: "text-success" },
];

const TILE_CLASS =
  "border-border bg-surface flex min-h-14 flex-col justify-center gap-0.5 rounded-xl border px-3 py-2.5 sm:min-h-16 sm:px-4";
const LINK_TILE_CLASS = `${TILE_CLASS} hover:border-primary/40 hover:bg-surface-hover focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none`;

/** Adds the tile's own tab without dropping a query the base route already carries. */
function tabHref(evaluationsHref: string, tab: StatTab): string {
  const [path, query] = evaluationsHref.split("?");
  const params = new URLSearchParams(query ?? "");
  params.set("tab", tab);
  return `${path}?${params.toString()}`;
}

export function StatCards({ pending, inProgress, completed, evaluationsHref }: StatCardsProps) {
  const counts: Record<StatTab, number> = {
    pending,
    "in-progress": inProgress,
    submitted: completed,
  };

  return (
    <section aria-label="Evaluation status summary" className="grid grid-cols-3 gap-2 sm:gap-3">
      {STATS.map((stat) => {
        const body = (
          <>
            <span
              className={`text-label-sm flex flex-wrap items-center justify-between gap-1 font-semibold ${stat.valueClass}`}
            >
              {stat.label}
              {evaluationsHref && <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />}
            </span>
            <span className="text-title-lg text-text-primary font-bold break-all tabular-nums">
              {counts[stat.tab]}
            </span>
          </>
        );

        return evaluationsHref ? (
          <Link
            key={stat.tab}
            href={tabHref(evaluationsHref, stat.tab)}
            aria-label={`${stat.label}: ${counts[stat.tab]}`}
            className={LINK_TILE_CLASS}
          >
            {body}
          </Link>
        ) : (
          <div key={stat.tab} className={TILE_CLASS}>
            {body}
          </div>
        );
      })}
    </section>
  );
}
