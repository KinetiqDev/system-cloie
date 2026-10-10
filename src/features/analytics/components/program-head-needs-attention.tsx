import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/ui/disclosure";
import type {
  NeedsAttentionItem,
  NeedsAttentionRule,
} from "@/features/analytics/services/get-program-head-dashboard";

const RULE_DOT: Record<NeedsAttentionRule, string> = {
  "closing-soon": "bg-warning",
  "zero-submissions": "bg-info",
  "zero-po-ratings": "bg-muted-foreground/60",
};

const MAX_VISIBLE_ITEMS = 5;

function AttentionRow({ item }: { item: NeedsAttentionItem }) {
  return (
    <li className="border-border/60 border-b last:border-b-0">
      <Link
        href={item.href}
        className="group hover:bg-surface-hover focus-visible:ring-ring -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none pointer-coarse:min-h-12"
      >
        <span
          aria-hidden="true"
          className={`size-2 shrink-0 rounded-full ${RULE_DOT[item.rules[0]]}`}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-title-sm text-text-primary text-pretty">{item.title}</span>
          <span className="text-body-sm text-text-secondary">{item.note}</span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="text-text-secondary size-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        />
      </Link>
    </li>
  );
}

/**
 * Needs attention (spec §13.9): the three operational rules, one line per
 * deployment or evidence source. The note text names the rule, so status
 * never relies on the dot color alone (§49).
 */
export function ProgramHeadNeedsAttention({ items }: { items: NeedsAttentionItem[] }) {
  const overflow = items.slice(MAX_VISIBLE_ITEMS);
  return (
    <Card className="gap-2">
      <CardHeader>
        <h2 className="text-heading-lg">
          Needs attention
          {items.length > 0 && (
            <span className="text-text-secondary ml-2 font-normal tabular-nums">
              <span className="sr-only">: </span>
              {items.length}
            </span>
          )}
        </h2>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-body-sm text-text-secondary py-2">
            Nothing is closing soon, every active evaluation has submissions, and every outcome has
            ratings.
          </p>
        ) : (
          <>
            <ul className="flex flex-col">
              {items.slice(0, MAX_VISIBLE_ITEMS).map((item) => (
                <AttentionRow key={item.id} item={item} />
              ))}
            </ul>
            {overflow.length > 0 && (
              <Disclosure className="mt-1">
                <DisclosureTrigger variant="link">Show {overflow.length} more</DisclosureTrigger>
                <DisclosureContent className="pt-0">
                  <ul className="border-border/60 flex flex-col border-t">
                    {overflow.map((item) => (
                      <AttentionRow key={item.id} item={item} />
                    ))}
                  </ul>
                </DisclosureContent>
              </Disclosure>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
