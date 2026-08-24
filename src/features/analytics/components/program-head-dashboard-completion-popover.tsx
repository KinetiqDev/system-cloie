"use client";

import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { StakeholderParticipation } from "@/features/analytics/aggregators/types";
import { STAKEHOLDER_LABELS } from "@/features/analytics/program-head-dashboard-labels";

function formatPercentage(rate: number | null): string {
  return rate === null ? "—" : `${(rate * 100).toFixed(1)}%`;
}

/**
 * Accessible completion details (§13.2): the stakeholder breakdown behind the
 * Response-completion KPI. The primitive owns focus, keyboard, and dismissal.
 */
export function CompletionBreakdownPopover({
  stakeholders,
}: {
  stakeholders: StakeholderParticipation[];
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Completion by stakeholder"
            className="text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-md transition-colors pointer-coarse:size-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Info aria-hidden="true" className="size-4" />
          </button>
        }
      />
      <PopoverContent align="end" className="w-72">
        <PopoverHeader>
          <PopoverTitle>Completion by stakeholder</PopoverTitle>
          <PopoverDescription>
            Submitted eligible assignments over all in-scope assignment rows.
          </PopoverDescription>
        </PopoverHeader>
        <table className="w-full text-left text-xs">
          <caption className="sr-only">Completion by stakeholder</caption>
          <thead>
            <tr className="border-border text-muted-foreground border-b">
              <th scope="col" className="py-1.5 font-medium">
                Stakeholder
              </th>
              <th scope="col" className="py-1.5 text-right font-medium">
                Submitted
              </th>
              <th scope="col" className="py-1.5 text-right font-medium">
                Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {stakeholders.map((row) => (
              <tr key={row.stakeholder} className="border-border/60 border-b last:border-b-0">
                <th scope="row" className="py-1.5 font-medium normal-case">
                  {STAKEHOLDER_LABELS[row.stakeholder] ?? row.stakeholder}
                </th>
                <td className="tabular-nums py-1.5 text-right">
                  {row.submitted} / {row.assigned}
                </td>
                <td className="tabular-nums py-1.5 text-right font-semibold">
                  {formatPercentage(row.completionRate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </PopoverContent>
    </Popover>
  );
}
