import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { buildGeneralEducationResponsesUrl } from "@/features/response-review/services/general-education-responses-state";
import type { GeneralEducationFeedbackDTO } from "@/features/analytics/general-education-analytics-types";
import { cn } from "@/lib/utils";
import type { GeneralEducationAnalyticsFilterState } from "@/features/analytics/services/general-education-analytics-state";
import { GeneralEducationInlineAiInsight } from "./general-education-inline-ai-insight";
import { LazyQualitativeWordCloud } from "./general-education-analytics-visualizations";
import { QualitativeTermChips, QualitativeToneSummary } from "./qualitative-evidence";
import {
  emptyScopeCopy,
  ScopeEmptyState,
  SectionShell,
} from "./general-education-evidence-primitives";

type GeneralEducationFeedbackViewProps = {
  data: GeneralEducationFeedbackDTO;
  resetHref: string;
  filters: GeneralEducationAnalyticsFilterState;
};

/**
 * Written feedback over the deterministic shared corpus. Terms are
 * identifier-redacted and must repeat before they appear; raw comment text
 * stays in the separately authorized identified review.
 */
export function GeneralEducationFeedbackView({
  data,
  resetHref,
  filters,
}: GeneralEducationFeedbackViewProps) {
  const {
    emptyReason,
    tokens,
    tone,
    qualitativeItemCount,
    qualitativeResponseCount,
    sourceLabel,
    promptCounts,
    evidenceEvaluations,
  } = data;
  const scopeEmpty = emptyScopeCopy(emptyReason === "no-qualitative-evidence" ? null : emptyReason);

  const evidenceBasis = `${qualitativeItemCount} identifier-redacted written ${
    qualitativeItemCount === 1 ? "answer" : "answers"
  } from ${qualitativeResponseCount} submitted ${
    qualitativeResponseCount === 1 ? "response" : "responses"
  }`;

  return (
    <div className="flex flex-col gap-6">
      {scopeEmpty ? (
        <ScopeEmptyState
          title={scopeEmpty.title}
          description={scopeEmpty.description}
          resetHref={resetHref}
        />
      ) : null}

      {emptyReason === "no-qualitative-evidence" ? (
        <ScopeEmptyState
          title="No qualitative evidence"
          description="Submitted responses exist in this scope, but none include a non-empty written comment. Quantitative views remain available."
          resetHref={resetHref}
        />
      ) : null}

      {!scopeEmpty && emptyReason === null ? (
        <>
          <SectionShell
            id="ge-word-cloud"
            title="Most-mentioned terms"
            description={`${sourceLabel}. Terms are identifier-redacted and released only when more than one respondent used them; counts are exact.`}
          >
            {tokens.length > 0 ? (
              <LazyQualitativeWordCloud
                title="Written feedback terms"
                tokens={tokens}
                answerCount={qualitativeItemCount}
              />
            ) : (
              <Alert variant="information">
                <AlertTitle>No term cleared the redaction floor</AlertTitle>
                <AlertDescription>
                  Submitted written evidence is counted below, but identifier redaction and the
                  repeat-mention rule left no term to display.
                </AlertDescription>
              </Alert>
            )}
          </SectionShell>

          <GeneralEducationInlineAiInsight
            view="qualitative"
            filters={filters}
            evidenceBasis={evidenceBasis}
            qualitative
          />

          <SectionShell
            id="ge-feedback-volume"
            title="Written answer volume"
            description={`${qualitativeItemCount} written ${qualitativeItemCount === 1 ? "answer" : "answers"} from ${qualitativeResponseCount} submitted ${qualitativeResponseCount === 1 ? "response" : "responses"}.`}
          >
            <dl
              aria-label="Written feedback volume"
              className="border-border grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-3"
            >
              <div className="flex flex-col gap-0.5">
                <dt className="text-label-sm text-text-secondary">Written answers</dt>
                <dd className="text-heading-md tabular-nums">{qualitativeItemCount}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-label-sm text-text-secondary">Contributing responses</dt>
                <dd className="text-heading-md tabular-nums">{qualitativeResponseCount}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-label-sm text-text-secondary">Evidence source</dt>
                <dd className="text-body-md">{sourceLabel}</dd>
              </div>
            </dl>
          </SectionShell>

          <div className="flex flex-col gap-4">
            <QualitativeToneSummary tone={tone} />
          </div>

          <SectionShell
            id="ge-feedback-prompts"
            title="Prompt structure"
            description="Written answers by instrument prompt and instrument version, with the highest-mention identifier-redacted terms and that prompt's tone counts. Each row keeps its own stable instrument identity, so two instruments sharing a label stay separate."
          >
            {promptCounts.length > 0 ? (
              <FeedbackPromptTable promptCounts={promptCounts} />
            ) : (
              <p className="text-body-sm text-text-secondary">
                No instrument prompt carried a released written answer in this scope.
              </p>
            )}
          </SectionShell>

          <SectionShell
            id="ge-feedback-review"
            title="Review identified evidence"
            description="Aggregates above carry no respondent identity. The separately authorized response review re-checks access and exposes the identified comments."
          >
            <FeedbackEvidenceLinks evaluations={evidenceEvaluations} filters={filters} />
          </SectionShell>
        </>
      ) : null}

      {/* The insight mounts on every Written-feedback scope, empty or not. */}
      {scopeEmpty || emptyReason !== null ? (
        <GeneralEducationInlineAiInsight
          view="qualitative"
          filters={filters}
          evidenceBasis="No released written feedback in this scope"
          qualitative
        />
      ) : null}
    </div>
  );
}

function FeedbackPromptTable({
  promptCounts,
}: {
  promptCounts: GeneralEducationFeedbackDTO["promptCounts"];
}) {
  return (
    <div className="border-border/80 overflow-x-auto rounded-lg border">
      <Table aria-label="Exact values: prompt structure">
        <TableHeader>
          <TableRow>
            <TableHead>Prompt</TableHead>
            <TableHead>Instrument</TableHead>
            <TableHead className="text-right">Answers</TableHead>
            <TableHead className="text-right">Responses</TableHead>
            <TableHead className="text-right whitespace-nowrap">Tone (pos / neu / neg)</TableHead>
            <TableHead>Top terms</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {promptCounts.map((prompt) => (
            <TableRow
              key={JSON.stringify([prompt.instrumentId, prompt.sourceLabel, prompt.promptKey])}
            >
              <TableCell className="align-top font-medium whitespace-normal">
                {prompt.sourceLabel} — {prompt.promptLabel}
              </TableCell>
              <TableCell className="align-top whitespace-normal">
                {prompt.instrumentLabel}
              </TableCell>
              <TableCell className="text-right align-top tabular-nums">
                {prompt.itemCount}
              </TableCell>
              <TableCell className="text-right align-top tabular-nums">
                {prompt.responseCount}
              </TableCell>
              <TableCell className="text-right align-top whitespace-nowrap tabular-nums">
                {prompt.tone.positive} / {prompt.tone.neutral} / {prompt.tone.negative}
              </TableCell>
              <TableCell className="align-top">
                <QualitativeTermChips
                  terms={prompt.terms}
                  label={`Top terms for ${prompt.promptLabel}`}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function FeedbackEvidenceLinks({
  evaluations,
  filters,
}: {
  evaluations: GeneralEducationFeedbackDTO["evidenceEvaluations"];
  filters: GeneralEducationAnalyticsFilterState;
}) {
  const scopeQuery = {
    termInstanceId: filters.termInstanceId,
    schoolYearId: filters.schoolYearId,
    semester: filters.semester,
    courseId: filters.courseId,
    programId: filters.programId,
    yearLevel: filters.yearLevel,
  };

  return (
    <div className="flex flex-col gap-3">
      {evaluations.length === 0 ? (
        <p className="text-body-sm text-text-secondary">
          No General Education evaluation contributed written answers in this scope.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {evaluations.map((evaluation) => (
            <li key={evaluation.evaluationId}>
              <Link
                href={buildGeneralEducationResponsesUrl({
                  page: 1,
                  ...scopeQuery,
                })}
                className={cn(
                  "text-link hover:text-foreground underline underline-offset-3",
                  "pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center"
                )}
              >
                Review all identified responses in this scope ({evaluation.deploymentName} and{" "}
                {evaluations.length - 1} more)
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
