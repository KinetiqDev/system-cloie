import type { ProgramHeadOutcomeScaleDistributionDTO } from "@/features/analytics/program-head-analytics-types";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Accessible Likert distribution for one instrument-version scale identity.
 * Category values and labels come from the frozen structure snapshot; scales
 * are never merged, so each incompatible scale renders as its own table.
 */
export function ProgramHeadLikertDistribution({
  distribution,
}: {
  distribution: ProgramHeadOutcomeScaleDistributionDTO;
}) {
  const total = distribution.categories.reduce((sum, category) => sum + category.count, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col gap-2">
        <h4 className="text-label-md text-foreground">Scale: {distribution.scaleLabel}</h4>
        <Empty className="py-4">
          <EmptyTitle>No ratings on this scale</EmptyTitle>
          <EmptyDescription>
            No valid ratings were aggregated for this scale in the selected scope.
          </EmptyDescription>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-label-md text-foreground">Scale: {distribution.scaleLabel}</h4>
      <div className="border-border overflow-x-auto rounded-lg border">
        <Table aria-label="Likert distribution by category">
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">Ratings</TableHead>
              <TableHead className="text-right">Share</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {distribution.categories.map((category) => (
              <TableRow key={category.value}>
                <TableCell className="font-medium">
                  {category.label ?? String(category.value)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{category.value}</TableCell>
                <TableCell className="text-right tabular-nums">{category.count}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {total === 0 ? "—" : `${(category.percentage * 100).toFixed(1)}%`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-body-sm text-text-secondary">
        {total} valid rating{total === 1 ? "" : "s"} on this scale.
      </p>
    </div>
  );
}
