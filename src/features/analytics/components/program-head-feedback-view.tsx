import { ClipboardList, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { buildProgramHeadResponsesCourseEvaluationPath } from "@/lib/constants/program-head-routes";
import type {
  ProgramHeadFeedbackDTO,
  ProgramHeadFeedbackPromptCountDTO,
} from "@/features/analytics/program-head-analytics-types";
import { LazyQualitativeWordCloud } from "./program-head-analytics-visualizations";
import { QualitativeTermChips, QualitativeToneSummary } from "./qualitative-evidence";
import type { ProgramHeadInsightFilters } from "@/features/analytics/services/program-head-analytics-state";
import { ProgramHeadInlineAiInsight } from "./program-head-inline-ai-insight";

type ProgramHeadFeedbackViewProps = {
  programId: string;
  data: ProgramHeadFeedbackDTO;
  resetHref: string;
  aiFilters?: ProgramHeadInsightFilters;
};

export function ProgramHeadFeedbackView({
  programId,
  data,
  resetHref,
  aiFilters,
}: ProgramHeadFeedbackViewProps) {
  const {
    emptyReason,
    tokens,
    tone,
    qualitativeItemCount,
    qualitativeResponseCount,
    sourceCounts,
    promptCounts,
    evidenceEvaluations,
  } = data;
  const resetClassName = cn(buttonVariants({ variant: "outline", size: "sm" }));

  return (
    <div className="flex flex-col gap-6">
      {emptyReason === "no-assignments" && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No evaluation assignments</EmptyTitle>
            <EmptyDescription>
              This Program has no evaluation assignments in the selected scope, so there is no
              qualitative feedback to summarize.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href={resetHref} className={resetClassName}>
              View all periods
            </Link>
          </EmptyContent>
        </Empty>
      )}

      {emptyReason === "no-submissions" && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No submitted responses</EmptyTitle>
            <EmptyDescription>
              Evaluation assignments exist, but no responses have been submitted yet in this scope.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href={resetHref} className={resetClassName}>
              Clear period filter
            </Link>
          </EmptyContent>
        </Empty>
      )}

      {emptyReason === "no-qualitative-evidence" && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquareText aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No qualitative evidence</EmptyTitle>
            <EmptyDescription>
              Submitted responses exist in this scope, but none include non-empty qualitative
              comments. Quantitative views remain available.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href={resetHref} className={resetClassName}>
              View all periods
            </Link>
          </EmptyContent>
        </Empty>
      )}

      {emptyReason === null && (
        <>
          {tokens.length > 0 ? (
            <LazyQualitativeWordCloud
              title="Qualitative Feedback"
              tokens={tokens}
              answerCount={qualitativeItemCount}
            />
          ) : (
            <Alert variant="information">
              <AlertTitle>No tokenizable terms</AlertTitle>
              <AlertDescription>
                Submitted qualitative evidence is counted below, but identifier redaction and word
                filtering left no terms to display in the word cloud.
              </AlertDescription>
            </Alert>
          )}

          <FeedbackCountTable
            title="Source counts"
            caption={`${qualitativeItemCount} qualitative items from ${qualitativeResponseCount} submitted ${
              qualitativeResponseCount === 1 ? "response" : "responses"
            }`}
            rows={sourceCounts.map((source) => ({
              key: source.sourceKey,
              label: source.sourceLabel,
              itemCount: source.itemCount,
              responseCount: source.responseCount,
            }))}
          />

          <QualitativeToneSummary tone={tone} />

          <FeedbackPromptTable prompts={promptCounts} />

          <FeedbackEvidenceLinks programId={programId} evaluations={evidenceEvaluations} />
          {aiFilters ? (
            <ProgramHeadInlineAiInsight
              programId={programId}
              analyticsView="qualitative"
              filters={aiFilters}
              evidenceBasis={`${qualitativeItemCount} anonymous written ${qualitativeItemCount === 1 ? "answer" : "answers"}`}
              qualitative
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function FeedbackCountTable({
  title,
  caption,
  rows,
}: {
  title: string;
  caption: string;
  rows: Array<{ key: string; label: string; itemCount: number; responseCount: number }>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-title-sm text-foreground">{title}</h3>
        <p className="text-body-sm text-text-secondary">{caption}</p>
      </div>
      <div className="border-border overflow-x-auto rounded-lg border">
        <Table aria-label={`Exact values: ${title}`}>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Responses</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell className="text-right tabular-nums">{row.itemCount}</TableCell>
                <TableCell className="text-right tabular-nums">{row.responseCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/**
 * Prompt-level qualitative structure: counts, tone, and the highest-mention
 * terms per instrument prompt, so terms are never presented as one
 * undifferentiated corpus.
 */
function FeedbackPromptTable({ prompts }: { prompts: ProgramHeadFeedbackPromptCountDTO[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-title-sm text-foreground">Prompt structure</h3>
        <p className="text-body-sm text-text-secondary">
          Non-empty submitted comments by evidence source and instrument prompt, with the
          highest-mention identifier-redacted terms and the tone counts for that prompt.
        </p>
      </div>
      <div className="border-border overflow-x-auto rounded-lg border">
        <Table aria-label="Exact values: Prompt structure">
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Responses</TableHead>
              <TableHead className="text-right whitespace-nowrap">Tone (pos / neu / neg)</TableHead>
              <TableHead>Top terms</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prompts.map((prompt) => (
              <TableRow key={`${prompt.sourceLabel}:${prompt.promptLabel}`}>
                <TableCell className="font-medium">
                  {prompt.sourceLabel} — {prompt.promptLabel}
                </TableCell>
                <TableCell className="text-right tabular-nums">{prompt.itemCount}</TableCell>
                <TableCell className="text-right tabular-nums">{prompt.responseCount}</TableCell>
                <TableCell className="text-right whitespace-nowrap tabular-nums">
                  {prompt.tone.positive} / {prompt.tone.neutral} / {prompt.tone.negative}
                </TableCell>
                <TableCell>
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
    </div>
  );
}

function FeedbackEvidenceLinks({
  programId,
  evaluations,
}: {
  programId: string;
  evaluations: ProgramHeadFeedbackDTO["evidenceEvaluations"];
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-title-sm text-foreground">Review evidence</h3>
      {evaluations.length === 0 ? (
        <p className="text-body-sm text-text-secondary">
          No course-bound review pages are available for this qualitative scope.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {evaluations.map((evaluation) => (
            <li key={evaluation.evaluationId}>
              <Link
                href={buildProgramHeadResponsesCourseEvaluationPath(
                  programId,
                  evaluation.evaluationId
                )}
                className={cn(
                  "text-link hover:text-foreground underline underline-offset-3",
                  "pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center"
                )}
              >
                {evaluation.deploymentName}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
