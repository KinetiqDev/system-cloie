import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PloMetric } from "@/features/analytics/aggregators/plo";
import { IdentifiedRespondentsTable } from "./identified-respondents-table";
import type { ProgramHeadCentralEvaluationDetail } from "../types";

type CentralEvaluationDetailProps = {
  detail: ProgramHeadCentralEvaluationDetail;
  responseHref: (responseId: string) => string;
};

function formatMean(value: number | null): string {
  return value === null ? "N/A" : value.toFixed(2);
}

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

export function CentralEvaluationDetail({ detail, responseHref }: CentralEvaluationDetailProps) {
  const { evaluation, summary, participation, ploResults, questionResults, respondents } = detail;

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
      </section>

      {/* Summary (§26) */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryStat label="Submitted" value={`${summary.submittedCount} / ${summary.assignedCount}`} />
        <SummaryStat label="Completion" value={formatPercent(summary.completionRate)} />
        <SummaryStat label="Evaluation mean" value={formatMean(summary.evaluationMean)} />
        <SummaryStat label="Qualitative answers" value={`${summary.qualitativeAnswerCount}`} />
      </section>

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
                ploResults.map((plo) => (
                  <TableRow key={plo.ploId}>
                    <TableCell className="font-medium">{plo.ploCode}</TableCell>
                    <TableCell>{plo.ploDescription}</TableCell>
                    <TableCell className="text-right">{plo.ratingCount}</TableCell>
                    <TableCell className="text-right">{plo.responseCount}</TableCell>
                    <TableCell className="text-right">{formatMean(plo.mean)}</TableCell>
                  </TableRow>
                ))
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
                questionResults.map((question) => (
                  <TableRow key={`${question.sectionKey}|${question.itemKey}`}>
                    <TableCell>{question.itemKey}</TableCell>
                    <TableCell>{question.prompt}</TableCell>
                    <TableCell>
                      {question.ploBindings.length > 0
                        ? question.ploBindings.map((binding) => binding.code).join(", ")
                        : "General evaluation item"}
                    </TableCell>
                    <TableCell className="text-right">{formatMean(question.quantitative?.mean ?? null)}</TableCell>
                    <TableCell className="text-right">{question.quantitative?.ratingCount ?? 0}</TableCell>
                    <TableCell>
                      <DistributionCounts metric={question.quantitative ?? null} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Participation (§26) */}
      <Card>
        <CardHeader>
          <CardTitle>Participation</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p>
            Eligible: <span className="font-semibold">{participation.assigned}</span> · Submitted:{" "}
            <span className="font-semibold">{participation.submitted}</span> · In progress:{" "}
            <span className="font-semibold">{participation.inProgress}</span> · Not started:{" "}
            <span className="font-semibold">{participation.notStarted}</span>
          </p>
        </CardContent>
      </Card>

      {/* Submitted respondents (§26) */}
      <IdentifiedRespondentsTable respondents={respondents} responseHref={responseHref} />
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border rounded-xl border p-4">
      <p className="text-text-muted text-sm">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function DistributionCounts({
  metric,
}: {
  metric: PloMetric["scaleGroups"][number] | null;
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