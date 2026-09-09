import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/ui/disclosure";
import type { ProgramHeadOutcomeDTO } from "@/features/analytics/program-head-analytics-types";

const MANIFESTATION_LABELS = {
  LEARNING: "Learning",
  PRACTICE: "Practice",
  OPPORTUNITY: "Opportunity",
} as const;

type ProgramHeadContributorMatrixProps = {
  outcomes: ProgramHeadOutcomeDTO[];
  selectedPloId?: string;
};

/**
 * Expandable CILO contributor matrix. Each PLO discloses the CILOs behind
 * its mean: the contributing CILO, its course, the descriptive mapping
 * manifestation, and the valid-rating-only mean and count. Manifestation
 * never filters or weights the numbers; it only labels how the CILO
 * relates to the outcome.
 */
export function ProgramHeadContributorMatrix({
  outcomes,
  selectedPloId,
}: ProgramHeadContributorMatrixProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-title-sm text-foreground">CILO contributor matrix</h3>
        <p className="text-body-sm text-text-secondary">
          Every Program Learning Outcome mean below is built from these CILO-level contributions.
          Means and counts pool valid in-scale ratings only.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {outcomes.map((outcome) => {
          const isSelected = outcome.ploId === selectedPloId;
          return (
            <Disclosure
              key={outcome.ploId}
              open={isSelected || undefined}
              className="border-border/80 bg-card rounded-xl border px-4 py-3 shadow-xs sm:px-5"
            >
              <DisclosureTrigger variant="card" className="text-label-md">
                <span>
                  {outcome.code}
                  <span className="text-text-secondary font-normal"> — {outcome.name}</span>
                </span>
                <span className="text-text-secondary text-xs font-medium tabular-nums">
                  {outcome.contributors.length === 1
                    ? "1 contributing CILO"
                    : `${outcome.contributors.length} contributing CILOs`}
                </span>
              </DisclosureTrigger>
              <DisclosureContent>
                {outcome.contributors.length > 0 ? (
                  <div className="border-border overflow-x-auto rounded-lg border">
                    <Table aria-label={`CILO contributions behind ${outcome.code}`}>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Contributing CILO</TableHead>
                          <TableHead>Course</TableHead>
                          <TableHead>Manifestation</TableHead>
                          <TableHead className="text-right">Mean Rating</TableHead>
                          <TableHead className="text-right">Valid Ratings</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {outcome.contributors.map((contributor) => (
                          <TableRow key={contributor.ciloId}>
                            <TableCell className="align-top">
                              <div className="flex flex-col">
                                <span className="font-semibold">{contributor.ciloCode}</span>
                                <span className="text-text-secondary">
                                  {contributor.ciloDescription}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="align-top">
                              {contributor.course ? (
                                <div className="flex flex-col">
                                  <span className="font-semibold">{contributor.course.code}</span>
                                  <span className="text-text-secondary">
                                    {contributor.course.title}
                                  </span>
                                </div>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="align-top">
                              {contributor.manifestation
                                ? MANIFESTATION_LABELS[contributor.manifestation]
                                : "Not classified"}
                            </TableCell>
                            <TableCell className="text-right align-top tabular-nums">
                              {contributor.meanRating.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right align-top tabular-nums">
                              {contributor.ratingCount}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-body-sm text-text-secondary">
                    No valid CILO-level contributions in this scope — this outcome has no valid
                    ratings to break down.
                  </p>
                )}
              </DisclosureContent>
            </Disclosure>
          );
        })}
      </div>
    </div>
  );
}
