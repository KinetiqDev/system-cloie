import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSectionLabel, getYearLevelDisplay } from "@/lib/constants/academic";
import { HowCalculatedPopover } from "@/features/analytics/components/how-calculated-popover";
import { describeScale } from "@/features/analytics/aggregators/scale-identity";
import type { MetricEvidenceSummary, QuestionMetric } from "@/features/analytics/aggregators/types";
import { IdentifiedRespondentsTable } from "./identified-respondents-table";
import { formatMean, formatPercent } from "./format";
import type { ProgramHeadCourseEvaluationDetail } from "../types";

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

type CourseEvaluationDetailProps = {
  detail: ProgramHeadCourseEvaluationDetail;
  responseHref: (responseId: string) => string;
  /** Link to the qualitative Analytics tab (§25.3). */
  analyticsHref: string;
};

function statusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

// Evaluation evidence stays in one read-only report so shared counts and links cannot diverge.
// fallow-ignore-next-line complexity
export function CourseEvaluationDetail({
  detail,
  responseHref,
  analyticsHref,
}: CourseEvaluationDetailProps) {
  const {
    evaluation,
    summary,
    participation,
    ciloResults,
    questionResults,
    qualitative,
    respondents,
  } = detail;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="border-border flex flex-col gap-2 border-b pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Course evaluation</Badge>
          <Badge variant="secondary">{statusLabel(evaluation.status)}</Badge>
        </div>
        <h1 className="text-heading-lg text-balance">{evaluation.title}</h1>
        <p className="text-body-md text-text-secondary text-pretty">
          <span className="text-foreground font-semibold">
            {evaluation.courseCode} — {evaluation.courseTitle}
          </span>
          {" · "}
          {evaluation.periodLabel}
        </p>
        <p className="text-body-sm text-muted-foreground">
          {evaluation.facultyName ?? "No faculty assigned"} ·{" "}
          {getYearLevelDisplay(evaluation.yearLevel)} · Section{" "}
          {getSectionLabel(evaluation.section)}
          {evaluation.majorLabel ? ` · ${evaluation.majorLabel}` : ""}
        </p>
        {evaluation.activationAt || evaluation.deadlineAt ? (
          <p className="text-body-sm text-muted-foreground">
            {evaluation.activationAt
              ? `Activated ${dateFormatter.format(evaluation.activationAt)}`
              : "Not yet activated"}
            {evaluation.deadlineAt
              ? ` · Deadline ${dateFormatter.format(evaluation.deadlineAt)}`
              : ""}
          </p>
        ) : null}
      </header>

      {/* Summary (§25) */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <SummaryStat
          label="Submitted"
          value={`${summary.submittedCount} / ${summary.eligibleCount}`}
        />
        <SummaryStat label="Completion" value={formatPercent(summary.completionRate)} />
        <SummaryStat
          label="Evaluation mean"
          value={formatMean(summary.evaluationMean)}
          evidence={{
            explanation:
              summary.evaluationScaleCount === 0
                ? "No valid quantitative ratings from submitted responses in this evaluation."
                : summary.evaluationScaleCount > 1
                  ? `Ratings span ${summary.evaluationScaleCount} incompatible scales; each scale is reported separately with no combined mean.`
                  : "Raw mean of all valid quantitative ratings from submitted responses; general items are included and qualitative answers are excluded.",
          }}
        />
        <SummaryStat label="CILOs" value={`${summary.ciloCount}`} />
        <SummaryStat label="Qualitative answers" value={`${summary.qualitativeAnswerCount}`} />
        <SummaryStat
          label="Qualitative respondents"
          value={`${summary.qualitativeRespondentCount}`}
        />
      </section>

      {/* Zero-response empty state (§50) */}
      {summary.submittedCount === 0 && (
        <div className="border-border rounded-xl border border-dashed p-6">
          <p className="text-text-muted text-sm">
            Evaluations exist, but no responses have been submitted.
          </p>
        </div>
      )}

      {/* CILO results (§25.1) */}
      <Card>
        <CardHeader>
          <CardTitle>CILO results</CardTitle>
          <CardDescription>
            Mapped quantitative evidence for this course evaluation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CILO</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>PLO mappings</TableHead>
                <TableHead className="text-right">Ratings</TableHead>
                <TableHead className="text-right">Responses</TableHead>
                <TableHead className="text-right">Mean</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ciloResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-text-muted text-center">
                    No CILO-bound ratings yet.
                  </TableCell>
                </TableRow>
              ) : (
                ciloResults.map((cilo) => (
                  <TableRow key={cilo.ciloId}>
                    <TableCell className="font-medium">CILO</TableCell>
                    <TableCell>{cilo.description}</TableCell>
                    <TableCell>{mappingLabels(cilo)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {cilo.quantitative?.ratingCount ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {cilo.quantitative?.responseCount ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        {formatMean(cilo.quantitative?.mean ?? null)}
                        <HowCalculatedPopover
                          metric={cilo.evidenceSummary}
                          label={`${cilo.ciloId} CILO mean`}
                        />
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Question results (§25.2) */}
      <Card>
        <CardHeader>
          <CardTitle>Question results</CardTitle>
          <CardDescription>
            Question-level means, bindings, and response distributions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Outcome binding</TableHead>
                <TableHead className="text-right">Mean</TableHead>
                <TableHead className="text-right">Ratings</TableHead>
                <TableHead>Distribution</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questionResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-text-muted text-center">
                    No quantitative answers yet.
                  </TableCell>
                </TableRow>
              ) : (
                questionResults.map((question) => {
                  const quantitative = question.quantitative;
                  const evidence = questionEvidence(question);
                  return (
                    <TableRow key={`${question.sectionKey}|${question.itemKey}`}>
                      <TableCell>{question.itemKey}</TableCell>
                      <TableCell>{question.prompt}</TableCell>
                      <TableCell>
                        {question.binding.type === "CILO"
                          ? question.binding.ciloLabel
                          : "General evaluation item"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          {formatMean(quantitative?.mean ?? null)}
                          <HowCalculatedPopover
                            metric={evidence}
                            label={`${question.itemKey} question mean`}
                          />
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {quantitative?.ratingCount ?? 0}
                      </TableCell>
                      <TableCell>
                        <DistributionCounts metric={quantitative ?? null} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Qualitative summary (§25.3) */}
      <Card>
        <CardHeader>
          <CardTitle>Qualitative summary</CardTitle>
          <CardDescription>
            Aggregate prompt counts; raw answers remain in submitted responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm">
            <span className="text-text-muted">Answers: </span>
            <span className="font-semibold tabular-nums">{qualitative.answerCount}</span>
            {" · "}
            <span className="text-text-muted">Respondents: </span>
            <span className="font-semibold tabular-nums">{qualitative.respondentCount}</span>
          </p>
          {qualitative.prompts.length === 0 ? (
            <p className="text-text-muted text-sm">No qualitative answers were submitted.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prompt</TableHead>
                  <TableHead className="text-right">Answers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qualitative.prompts.map((prompt) => (
                  <TableRow key={prompt.prompt}>
                    <TableCell>{prompt.prompt}</TableCell>
                    <TableCell className="text-right tabular-nums">{prompt.answerCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {qualitative.topTerms.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {qualitative.topTerms.slice(0, 12).map((term) => (
                <Badge key={term.text} variant="secondary" className="tabular-nums">
                  {term.text} · {term.value}
                </Badge>
              ))}
            </div>
          )}
          <Link
            href={analyticsHref}
            className="text-link text-sm underline-offset-4 hover:underline"
          >
            Open qualitative analytics
          </Link>
        </CardContent>
      </Card>

      {/* Participation (§25.4) */}
      <Card>
        <CardHeader>
          <CardTitle>Participation</CardTitle>
          <CardDescription>Assignment status for this evaluation.</CardDescription>
        </CardHeader>
        <CardContent className="text-body-sm">
          <p>
            Eligible: <span className="font-semibold tabular-nums">{participation.assigned}</span> ·
            Submitted: <span className="font-semibold tabular-nums">{participation.submitted}</span>{" "}
            · In progress:{" "}
            <span className="font-semibold tabular-nums">{participation.inProgress}</span> · Not
            started: <span className="font-semibold tabular-nums">{participation.notStarted}</span>
          </p>
        </CardContent>
      </Card>

      {/* Submitted respondents (§25.5) */}
      <IdentifiedRespondentsTable
        respondents={respondents}
        responseHrefs={Object.fromEntries(
          respondents.map((respondent) => [
            respondent.responseId,
            responseHref(respondent.responseId),
          ])
        )}
      />
    </div>
  );
}

function questionEvidence(question: Pick<QuestionMetric, "quantitative">): MetricEvidenceSummary {
  const quantitative = question.quantitative;
  return {
    ratingCount: quantitative?.ratingCount ?? 0,
    responseCount: quantitative?.responseCount ?? 0,
    scaleLabel: quantitative?.scale ? describeScale(quantitative.scale.descriptors) : undefined,
    explanation:
      quantitative === null
        ? "No valid ratings for this question in the submitted responses."
        : `Mean of ${quantitative.ratingCount} valid ratings for this question from submitted responses.`,
  };
}

function SummaryStat({
  label,
  value,
  evidence,
}: {
  label: string;
  value: string;
  evidence?: MetricEvidenceSummary;
}) {
  return (
    <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
      <div className="flex items-start justify-between gap-1">
        <p className="text-label-sm text-muted-foreground font-semibold">{label}</p>
        {evidence ? <HowCalculatedPopover metric={evidence} label={label} /> : null}
      </div>
      <p className="text-title-lg mt-1 font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function mappingLabels(cilo: {
  mappings: Array<{ ploCode: string; manifestation: string }>;
}): string {
  return cilo.mappings.length === 0
    ? "—"
    : cilo.mappings.map((mapping) => `${mapping.ploCode} (${mapping.manifestation})`).join(", ");
}

function DistributionCounts({
  metric,
}: {
  metric: { distribution: Array<{ label: string; count: number }> } | null;
}) {
  if (!metric) {
    return <span className="text-text-muted text-sm">—</span>;
  }
  return (
    <span className="text-text-muted text-xs">
      {metric.distribution
        .filter((entry) => entry.count > 0)
        .map((entry) => `${entry.label}: ${entry.count}`)
        .join(" · ")}
    </span>
  );
}
