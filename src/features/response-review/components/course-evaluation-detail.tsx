import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CiloMetric, QuestionMetric } from "@/features/analytics/aggregators/types";
import { IdentifiedRespondentsTable } from "./identified-respondents-table";
import type { ProgramHeadCourseEvaluationDetail } from "../types";

type CourseEvaluationDetailProps = {
  detail: ProgramHeadCourseEvaluationDetail;
  responseHref: (responseId: string) => string;
};

function formatMean(value: number | null): string {
  return value === null ? "N/A" : value.toFixed(2);
}

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

export function CourseEvaluationDetail({ detail, responseHref }: CourseEvaluationDetailProps) {
  const { evaluation, summary, participation, ciloResults, questionResults, respondents } = detail;

  return (
    <div className="space-y-6">
      {/* Header (§25) */}
      <section className="space-y-1">
        <h1 className="text-2xl font-bold">{evaluation.title}</h1>
        <p className="text-text-muted text-sm">
          {evaluation.courseCode} — {evaluation.courseTitle} | {evaluation.periodLabel}
        </p>
        <p className="text-text-muted text-sm">
          {evaluation.facultyName ?? "No faculty"} · Year {evaluation.yearLevel} · Section{" "}
          {evaluation.section}
          {evaluation.majorLabel ? ` · ${evaluation.majorLabel}` : ""} · {evaluation.status}
        </p>
      </section>

      {/* Summary (§25) */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryStat label="Submitted" value={`${summary.submittedCount} / ${summary.eligibleCount}`} />
        <SummaryStat label="Completion" value={formatPercent(summary.completionRate)} />
        <SummaryStat label="Evaluation mean" value={formatMean(summary.evaluationMean)} />
        <SummaryStat label="Qualitative answers" value={`${summary.qualitativeAnswerCount}`} />
      </section>

      {/* CILO results (§25.1) */}
      <Card>
        <CardHeader>
          <CardTitle>CILO Results</CardTitle>
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
                    <TableCell className="text-right">{cilo.quantitative?.ratingCount ?? 0}</TableCell>
                    <TableCell className="text-right">{cilo.quantitative?.responseCount ?? 0}</TableCell>
                    <TableCell className="text-right">{formatMean(cilo.quantitative?.mean ?? null)}</TableCell>
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
                      {question.binding.type === "CILO"
                        ? question.binding.ciloLabel
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

      {/* Participation (§25.4) */}
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

      {/* Submitted respondents (§25.5) */}
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

function mappingLabels(cilo: CiloMetric): string {
  return cilo.mappings.length === 0
    ? "—"
    : cilo.mappings
        .map((mapping) => `${mapping.ploCode} (${mapping.manifestation})`)
        .join(", ");
}

function DistributionCounts({
  metric,
}: {
  metric: QuestionMetric["quantitative"];
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