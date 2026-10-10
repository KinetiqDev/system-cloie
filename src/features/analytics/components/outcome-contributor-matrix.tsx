import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/ui/disclosure";
import { AttainmentBadge } from "./outcome-attainment-badge";
import type {
  OutcomeContributorDTO,
  OutcomeEvidenceDTO,
  OutcomeLayerLabels,
} from "@/features/analytics/outcome-evidence-types";

const MANIFESTATION_LABELS = {
  LEARNING: "Learning",
  PRACTICE: "Practice",
  OPPORTUNITY: "Opportunity",
} as const;

type OutcomeContributorMatrixProps = {
  outcomes: OutcomeEvidenceDTO[];
  labels: OutcomeLayerLabels;
  selectedOutcomeId?: string;
  renderReviewLinks?: (outcome: OutcomeEvidenceDTO) => ReactNode;
};

type OutcomeContributor = OutcomeContributorDTO;

function contributorKey(contributor: OutcomeContributor): string {
  return contributor.kind === "CILO"
    ? `cilo:${contributor.ciloId}`
    : JSON.stringify([
        "direct",
        contributor.evaluationId,
        contributor.sectionKey,
        contributor.itemKey,
      ]);
}

function ContributorName({
  contributor,
  labels,
}: {
  contributor: OutcomeContributor;
  labels: OutcomeLayerLabels;
}) {
  return (
    <div className="flex flex-col">
      <span className="font-semibold">
        {contributor.kind === "CILO" ? contributor.ciloCode : `Direct ${labels.short} question`}
      </span>
      <span className="text-text-secondary">
        {contributor.kind === "CILO" ? contributor.ciloDescription : contributor.questionPrompt}
      </span>
    </div>
  );
}

function ContributorCourse({ contributor }: { contributor: OutcomeContributor }) {
  return (
    <div className="flex flex-col">
      <span className="font-semibold">{contributor.course?.code ?? "—"}</span>
      <span className="text-text-secondary">
        {contributor.kind === "CILO"
          ? (contributor.course?.title ?? "Course unavailable")
          : contributor.deploymentName}
      </span>
    </div>
  );
}

function ContributorBinding({ contributor }: { contributor: OutcomeContributor }) {
  if (contributor.kind !== "CILO") return <>Direct at publication</>;
  if (!contributor.manifestation) return <>Not classified</>;
  return <>{MANIFESTATION_LABELS[contributor.manifestation]}</>;
}

function ContributorRow({
  contributor,
  labels,
}: {
  contributor: OutcomeContributor;
  labels: OutcomeLayerLabels;
}) {
  return (
    <TableRow>
      <TableCell className="align-top">
        <ContributorName contributor={contributor} labels={labels} />
      </TableCell>
      <TableCell className="align-top">
        <ContributorCourse contributor={contributor} />
      </TableCell>
      <TableCell className="align-top">
        <ContributorBinding contributor={contributor} />
      </TableCell>
      <TableCell className="text-right align-top tabular-nums">
        <div>{contributor.meanRating.toFixed(2)}</div>
      </TableCell>
      <TableCell className="text-right align-top tabular-nums">{contributor.ratingCount}</TableCell>
    </TableRow>
  );
}

/**
 * Expandable outcome contributor matrix. CILO-derived rows retain course and
 * manifestation context; direct rows retain their frozen question prompt.
 */
export function OutcomeContributorMatrix({
  outcomes,
  labels,
  selectedOutcomeId,
  renderReviewLinks,
}: OutcomeContributorMatrixProps) {
  const hasDirect = outcomes.some((outcome) =>
    outcome.contributors.some((contributor) => contributor.kind === "DIRECT")
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-heading-lg text-foreground">Outcome contributor matrix</h2>
        <p className="text-body-sm text-text-secondary">
          {hasDirect
            ? `${labels.singular} means may include CILO-derived evidence and questions bound directly at publication.`
            : `${labels.singular} means come from rated questions bound to CILOs aligned with each outcome.`}{" "}
          Means and counts pool valid in-scale ratings only.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {outcomes.map((outcome) => {
          const isSelected = outcome.outcomeId === selectedOutcomeId;
          return (
            <Disclosure
              key={outcome.outcomeId}
              open={isSelected || undefined}
              className="border-border/80 bg-card rounded-xl border px-4 py-3 shadow-xs sm:px-5"
            >
              <DisclosureTrigger variant="card" className="text-label-md">
                <span>
                  {outcome.code}
                  <span className="text-text-secondary font-normal"> — {outcome.name}</span>
                </span>
                <span className="flex items-center gap-2">
                  {outcome.attainment !== undefined && (
                    <AttainmentBadge attainment={outcome.attainment} compact />
                  )}
                  <span className="text-text-secondary text-xs font-medium tabular-nums">
                    {outcome.contributors.length} contributor
                    {outcome.contributors.length === 1 ? "" : "s"}
                  </span>
                </span>
              </DisclosureTrigger>
              <DisclosureContent>
                {outcome.contributors.length > 0 ? (
                  <div className="border-border overflow-x-auto rounded-lg border">
                    <Table aria-label={`Contributions behind ${outcome.code}`}>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Contributor</TableHead>
                          <TableHead>Course / Evaluation</TableHead>
                          <TableHead>Binding</TableHead>
                          <TableHead className="text-right">Mean Rating</TableHead>
                          <TableHead className="text-right">Valid Ratings</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {outcome.contributors.map((contributor) => (
                          <ContributorRow
                            key={contributorKey(contributor)}
                            contributor={contributor}
                            labels={labels}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-body-sm text-text-secondary">
                    No valid contributor evidence in this scope.
                  </p>
                )}
                {renderReviewLinks?.(outcome)}
              </DisclosureContent>
            </Disclosure>
          );
        })}
      </div>
    </div>
  );
}
