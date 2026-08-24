import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { HowCalculatedPopover } from "@/features/analytics/components/how-calculated-popover";
import { describeScale } from "@/features/analytics/aggregators/scale-identity";
import type { MetricEvidenceSummary, QuestionMetric } from "@/features/analytics/aggregators/types";
import { IdentifiedRespondentsTable } from "./identified-respondents-table";
import { formatMean, formatPercent } from "./format";
import type { ProgramHeadCentralEvaluationDetail } from "../types";

type CentralEvaluationDetailProps = {
  detail: ProgramHeadCentralEvaluationDetail;
  responseHref: (responseId: string) => string;
  /** Link to the qualitative Analytics tab (§26). */
  analyticsHref: string;
};

export function CentralEvaluationDetail({
  detail,
  responseHref,
  analyticsHref,
}: CentralEvaluationDetailProps) {
  const { evaluation, summary, participation, ploResults, questionResults, qualitative, respondents } =
    detail;

  return (
    <div className="space-y-6">
      {/* Header (§26) */}
      <section className="space-y-1">
        <h1 className="text-2xl font-bold">{evaluation.title}</h1>
        <p className="text-text-muted text-sm">
          {evaluation.stakeholder} | {evaluation.periodLabel}
        </p>
        <p className="text-text-muted text-sm">
          {evaluation.targetProgramLabel ?? "College-wide"}
          {evaluation.targetMajorLabel ? ` · ${evaluation.targetMajorLabel}` : ""}
          {evaluation.targetYearLevel ? ` · Year ${evaluation.targetYearLevel}` : ""} · v
          {evaluation.instrumentVersion} · {evaluation.status}
        </p>
        {(evaluation.activationAt || evaluation.deadlineAt) && (
          <p className="text-text-muted text-sm">
            {evaluation.activationAt
              ? `Activated ${evaluation.activationAt.toLocaleDateString()}`
              : "Not yet activated"}
            {evaluation.deadlineAt
              ? ` · Deadline ${evaluation.deadlineAt.toLocaleDateString()}`
              : ""}
          </p>
        )}
      </section>

      {/* Summary (§26) */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <SummaryStat label="Submitted" value={`${summary.submittedCount} / ${summary.assignedCount}`} />
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
        <SummaryStat label="PLOs" value={`${ploResults.length}`} />
        <SummaryStat label="Qualitative answers" value={`${summary.qualitativeAnswerCount}`} />
        <SummaryStat
          label="Qualitative respondents"
          value={`${summary.qualitativeRespondentCount}`}
        />
      </section>

      {/* Zero-response empty state (§50) */}
      {summary.submittedCount === 0 && (
        <div className="border-border rounded-xl border border-dashed p-6">
          <p className="text-text-muted text-sm">Evaluations exist, but no responses have been submitted.</p>
        </div>
      )}

      {/* Direct PLO results (§26) */}
      <Card>
        <CardHeader>
          <CardTitle>Direct PLO Results</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PLO</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Ratings</TableHead>
                <TableHead className="text-right">Responses</TableHead>
                <TableHead className="text-right">Mean</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ploResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-text-muted text-center">
                    No PLO-bound ratings yet.
                  </TableCell>
                </TableRow>
              ) : (
                ploResults.map((plo) => {
                  const evidence = {
                    ratingCount: plo.ratingCount,
                    responseCount: plo.responseCount,
                    evaluationCount: plo.evaluationCount,
                    questionCount: plo.questionCount,
                    scaleLabel:
                      plo.scaleGroups.length === 1 && plo.scaleGroups[0].scale
                        ? describeScale(plo.scaleGroups[0].scale.descriptors)
                        : undefined,
                    explanation: `Mean of ${plo.ratingCount} valid ratings from ${plo.questionCount} bound question(s); unbound items are excluded.`,
                  };
                  return (
                    <TableRow key={plo.ploId}>
                      <TableCell className="font-medium">{plo.ploCode}</TableCell>
                      <TableCell>{plo.ploDescription}</TableCell>
                      <TableCell className="text-right tabular-nums">{plo.ratingCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{plo.responseCount}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          {formatMean(plo.mean)}
                          <HowCalculatedPopover metric={evidence} label={`${plo.ploCode} mean`} />
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Question results (§26) */}
      <Card>
        <CardHeader>
          <CardTitle>Question Results</CardTitle>
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
                        {question.ploBindings.length > 0
                          ? question.ploBindings.map((binding) => binding.code).join(", ")
                          : "General evaluation item"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          {formatMean(quantitative?.mean ?? null)}
                          <HowCalculatedPopover metric={evidence} label={`${question.itemKey} question mean`} />
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

      {/* Qualitative summary (§26) */}
      <Card>
        <CardHeader>
          <CardTitle>Qualitative Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

      {/* Participation (§26) */}
      <Card>
        <CardHeader>
          <CardTitle>Participation</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p>
            Eligible: <span className="font-semibold tabular-nums">{participation.assigned}</span> · Submitted:{" "}
            <span className="font-semibold tabular-nums">{participation.submitted}</span> · In progress:{" "}
            <span className="font-semibold tabular-nums">{participation.inProgress}</span> · Not started:{" "}
            <span className="font-semibold tabular-nums">{participation.notStarted}</span>
          </p>
        </CardContent>
      </Card>

      {/* Submitted respondents (§26) */}
      <IdentifiedRespondentsTable respondents={respondents} responseHref={responseHref} />
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
    <div className="border-border rounded-xl border p-4">
      <div className="flex items-start justify-between gap-1">
        <p className="text-text-muted text-sm">{label}</p>
        {evidence && <HowCalculatedPopover metric={evidence} label={label} />}
      </div>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function DistributionCounts({ metric }: { metric: { distribution: Array<{ label: string; count: number }> } | null }) {
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