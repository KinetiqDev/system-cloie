"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, RefreshCw, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { generateProgramHeadAnalyticsInsightAction } from "@/lib/actions/program-head-analytics-actions";
import type { GenerateAIInsightResult } from "@/features/analytics/services/generate-program-head-analytics-insight";
import type { AnalyticsFilterState } from "@/features/analytics/services/program-head-analytics-state";
import {
  buildAnalyticsFilterFingerprint,
  buildAnalyticsTabUrl,
} from "@/features/analytics/services/program-head-analytics-state";
import type {
  ProgramHeadAIInsightsSuccessDTO,
  ProgramHeadAISentimentStatus,
  ProgramHeadAnalyticsScopeSummary,
} from "@/features/analytics/program-head-analytics-types";

type ProgramHeadAIInsightsViewProps = {
  programId: string;
  filters: AnalyticsFilterState;
  scope: ProgramHeadAnalyticsScopeSummary;
};

const SENTIMENT_LABELS: Record<ProgramHeadAISentimentStatus, string> = {
  positive: "Positive",
  negative: "Negative",
  neutral: "Neutral",
  mixed: "Mixed",
};

function percent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

export function ProgramHeadAIInsightsView({
  programId,
  filters,
  scope,
}: ProgramHeadAIInsightsViewProps) {
  const [result, setResult] = useState<GenerateAIInsightResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentFingerprint = buildAnalyticsFilterFingerprint(filters);
  const isStale = result?.ok === true && result.data.fingerprint !== currentFingerprint;

  function requestInterpretation() {
    startTransition(async () => {
      setResult(
        await generateProgramHeadAnalyticsInsightAction({
          programId,
          filters: {
            tab: filters.tab,
            schoolYearId: filters.schoolYearId,
            semester: filters.semester,
            termInstanceId: filters.termInstanceId,
            evidenceSource: filters.evidenceSource,
            stakeholder: filters.stakeholder,
          },
        })
      );
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card size="sm">
        <CardHeader>
          <CardTitle>On-demand interpretation</CardTitle>
          <CardDescription>
            Request a supplementary, bounded interpretation of the current deterministic evidence
            scope. The system rebuilds and re-authorizes the evidence server-side, sends only
            de-identified aggregates to a deliberately configured provider, and returns validated
            findings for your review. Results are never saved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={requestInterpretation} disabled={isPending}>
            {isPending ? (
              <>
                <Spinner size="sm" label="Generating interpretation" />
                Generating…
              </>
            ) : result?.ok === true ? (
              "Generate new interpretation"
            ) : (
              "Generate interpretation"
            )}
          </Button>
          {isPending ? (
            <p className="text-body-md text-muted-foreground mt-3" role="status">
              Rebuilding evidence and requesting interpretation. This may take a minute.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {result?.ok === false ? <FailureState result={result} /> : null}

      {result?.ok === true ? (
        <InterpretationResult
          programId={programId}
          filters={filters}
          scope={scope}
          data={result.data}
          stale={isStale}
        />
      ) : null}
    </div>
  );
}

function FailureState({ result }: { result: Extract<GenerateAIInsightResult, { ok: false }> }) {
  if (result.state === "disabled") {
    return (
      <Alert variant="information">
        <ShieldAlert aria-hidden="true" />
        <AlertTitle>AI Insights are not enabled</AlertTitle>
        <AlertDescription>
          This deployment has not enabled the AI interpretation provider. All deterministic
          analytics views remain available.
        </AlertDescription>
      </Alert>
    );
  }

  if (result.state === "insufficient-evidence") {
    const {
      submittedResponseCount,
      minimumSubmittedResponses,
      qualitativeItemCount,
      minimumQualitativeItems,
    } = result.detail;
    return (
      <Alert variant="warning">
        <AlertTriangle aria-hidden="true" />
        <AlertTitle>Not enough evidence for a responsible interpretation</AlertTitle>
        <AlertDescription>
          The current scope has {submittedResponseCount} submitted response
          {submittedResponseCount === 1 ? "" : "s"} (minimum {minimumSubmittedResponses}) and{" "}
          {qualitativeItemCount} non-empty qualitative item
          {qualitativeItemCount === 1 ? "" : "s"} (minimum {minimumQualitativeItems}). No provider
          request was made.
        </AlertDescription>
      </Alert>
    );
  }

  const message =
    result.state === "timeout"
      ? "The interpretation provider took too long to respond. Try again."
      : "The interpretation could not be generated. This is recoverable: try again, or use the deterministic analytics views.";

  return (
    <Alert variant="destructive">
      <AlertTriangle aria-hidden="true" />
      <AlertTitle>Interpretation unavailable</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

type InterpretationResultProps = {
  programId: string;
  filters: AnalyticsFilterState;
  scope: ProgramHeadAnalyticsScopeSummary;
  data: ProgramHeadAIInsightsSuccessDTO;
  stale: boolean;
};

function InterpretationResult({
  programId,
  filters,
  scope,
  data,
  stale,
}: InterpretationResultProps) {
  const { sentimentCounts, sentimentClassifications, evidenceScope } = data;
  return (
    <div className="flex flex-col gap-4">
      {stale ? (
        <Alert variant="warning">
          <RefreshCw aria-hidden="true" />
          <AlertTitle>Filters changed since this interpretation</AlertTitle>
          <AlertDescription>
            The scope filters changed after this interpretation was generated. Generate a new
            interpretation before relying on it.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card size="sm">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>
            {scope.programCode} — {scope.programName}
            {scope.periodLabel ? ` · ${scope.periodLabel}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-body-md">{data.summary}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <TextListCard title="Strengths" items={data.strengths} />
        <TextListCard title="Areas for review" items={data.areasForReview} />
      </div>

      {data.themes.length > 0 ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Themes</CardTitle>
            <CardDescription>
              {data.themes.length} bounded theme(s) over aggregate evidence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {data.themes.map((theme) => (
                <li key={theme.name} className="flex flex-col gap-1">
                  <span className="text-label-md font-semibold">{theme.name}</span>
                  <span className="text-body-md text-muted-foreground">{theme.summary}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {sentimentCounts.length > 0 ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Sentiment overview</CardTitle>
            <CardDescription>
              Counts and shares computed by System CLOIE from validated classifications, not
              provider totals.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Table aria-label="Sentiment overview counts">
              <TableHeader>
                <TableRow>
                  <TableHead>Sentiment</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sentimentCounts
                  .filter((entry) => entry.count > 0)
                  .map((entry) => (
                    <TableRow key={entry.sentiment}>
                      <TableCell>{SENTIMENT_LABELS[entry.sentiment]}</TableCell>
                      <TableCell className="text-right">{entry.count}</TableCell>
                      <TableCell className="text-right">{percent(entry.percentage)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            <div>
              <p className="text-label-md mb-2 font-semibold">Classification basis</p>
              <ul className="flex flex-col gap-2">
                {sentimentClassifications.map((classification) => (
                  <li
                    key={`${classification.evidenceCategory}-${classification.sentiment}-${classification.rationale}`}
                  >
                    <span className="text-body-md font-medium">
                      {classification.evidenceCategory}:{" "}
                      {SENTIMENT_LABELS[classification.sentiment]}
                    </span>
                    <span className="text-body-md text-muted-foreground block">
                      {classification.rationale}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <TextListCard title="Questions for human review" items={data.questionsForHumanReview} />

      <TextListCard title="Limitations" items={data.limitations} />

      <Card size="sm">
        <CardHeader>
          <CardTitle>Evidence analyzed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-body-md text-muted-foreground">
            Interpreted {evidenceScope.submittedResponseCount} submitted response
            {evidenceScope.submittedResponseCount === 1 ? "" : "s"} and{" "}
            {evidenceScope.qualitativeItemCount} non-empty qualitative item
            {evidenceScope.qualitativeItemCount === 1 ? "" : "s"} across{" "}
            {evidenceScope.evaluatedSourceLabels.join(", ")}. Analyzed{" "}
            {evidenceScope.tokenAnalysis.includedTokenCount} of{" "}
            {evidenceScope.tokenAnalysis.availableTokenCount} word-frequency token
            {evidenceScope.tokenAnalysis.availableTokenCount === 1 ? "" : "s"}
            {evidenceScope.tokenAnalysis.truncated ? " (bounded; the rest were withheld)" : ""}.
            Interpretation covers aggregate evidence only — never raw comments.
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Human CQI decision remains authoritative</CardTitle>
          <CardDescription>
            This interpretation is supplementary. Return to the deterministic evidence before making
            a quality improvement decision.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <a
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            href={buildAnalyticsTabUrl(programId, "outcomes", filters)}
          >
            Review Outcomes
          </a>
          <a
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            href={buildAnalyticsTabUrl(programId, "qualitative", filters)}
          >
            Review Qualitative
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

function TextListCard({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item} className="text-body-md text-muted-foreground">
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
