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
import { IdentifiedRespondentsTable } from "./identified-respondents-table";
import { formatMean, formatPercent } from "./format";
import type { ProgramHeadCourseEvaluationDetail } from "../types";

type CourseEvaluationDetailProps = {
  detail: ProgramHeadCourseEvaluationDetail;
  responseHref: (responseId: string) => string;
  /** Link to the qualitative Analytics tab (§25.3). */
  analyticsHref: string;
};

export function CourseEvaluationDetail({
  detail,
  responseHref,
  analyticsHref,
}: CourseEvaluationDetailProps) {
  const { evaluation, summary, participation, ciloResults, questionResults, qualitative, respondents } =
    detail;

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

      {/* Summary (§25) */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <SummaryStat label="Submitted" value={`${summary.submittedCount} / ${summary.eligibleCount}`} />
        <SummaryStat label="Completion" value={formatPercent(summary.completionRate)} />
        <SummaryStat label="Evaluation mean" value={formatMean(summary.evaluationMean)} />
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
          <p className="text-text-muted text-sm">Evaluations exist, but no responses have been submitted.</p>
        </div>
      )}

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
                    <TableCell className="text-right tabular-nums">
                      {cilo.quantitative?.ratingCount ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {cilo.quantitative?.responseCount ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMean(cilo.quantitative?.mean ?? null)}
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
                    <TableCell className="text-right tabular-nums">
                      {formatMean(question.quantitative?.mean ?? null)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {question.quantitative?.ratingCount ?? 0}
                    </TableCell>
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

      {/* Qualitative summary (§25.3) */}
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

      {/* Participation (§25.4) */}
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

      {/* Submitted respondents (§25.5) */}
      <IdentifiedRespondentsTable respondents={respondents} responseHref={responseHref} />
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border rounded-xl border p-4">
      <p className="text-text-muted text-sm">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function mappingLabels(cilo: { mappings: Array<{ ploCode: string; manifestation: string }> }): string {
  return cilo.mappings.length === 0
    ? "—"
    : cilo.mappings.map((mapping) => `${mapping.ploCode} (${mapping.manifestation})`).join(", ");
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