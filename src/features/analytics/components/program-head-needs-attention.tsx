import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import type {
  NeedsAttentionItem,
  NeedsAttentionRule,
} from "@/features/analytics/services/get-program-head-dashboard";

const RULE_LABELS: Record<NeedsAttentionRule, string> = {
  "closing-soon": "Closing soon",
  "zero-submissions": "No submissions",
  "zero-plo-ratings": "No ratings",
};

const MAX_VISIBLE_ITEMS = 10;

/**
 * Needs attention (spec §13.9): exactly the three resolved operational rules.
 * Status carries text labels, never color alone (§49).
 */
export function ProgramHeadNeedsAttention({ items }: { items: NeedsAttentionItem[] }) {
  const visible = items.slice(0, MAX_VISIBLE_ITEMS);
  const remaining = items.length - visible.length;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-bold">Needs attention</CardTitle>
        <CardDescription>Operational facts only; no performance thresholds.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <Empty>
            <EmptyTitle>Nothing needs attention</EmptyTitle>
            <EmptyDescription>
              No active evaluation is closing within 7 days, none is without submissions, and every
              outcome has evidence for its sources.
            </EmptyDescription>
          </Empty>
        ) : (
          <>
            <ul className="flex flex-col">
              {visible.map((item) => (
                <li key={item.id} className="border-border/60 border-b last:border-b-0">
                  <Link
                    href={item.href}
                    className="focus-visible:ring-ring -mx-2 flex items-start gap-3 rounded-lg px-2 py-2.5 pointer-coarse:min-h-11 focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span className="mt-0.5 shrink-0">
                      <span
                        aria-hidden="true"
                        className={`inline-block size-2 rounded-full align-middle ${
                          item.rule === "closing-soon"
                            ? "bg-warning"
                            : item.rule === "zero-submissions"
                              ? "bg-info"
                              : "bg-muted-foreground/50"
                        }`}
                      />
                      <span className="sr-only">{RULE_LABELS[item.rule]}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="text-label-md block truncate font-bold" title={item.title}>
                        {item.title}
                      </span>
                      <span className="text-muted-foreground mt-0.5 block text-label-sm">
                        {RULE_LABELS[item.rule]}
                        {item.note ? ` · ${item.note}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {remaining > 0 && (
              <p className="text-muted-foreground mt-2 text-label-sm">
                +{remaining} more across sources and evaluations
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
