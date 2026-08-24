import { Fragment } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMean } from "./format";
import {
  STAKEHOLDER_EVIDENCE_SOURCE,
  buildAnalyticsUrl,
} from "@/features/analytics/services/program-head-analytics-state";
import type { ProgramHeadSubmittedResponseDetail, QuantitativeSubmittedAnswer } from "../types";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

type ResponseDetailProps = {
  response: ProgramHeadSubmittedResponseDetail;
  /** Link back to the evaluation detail page this response belongs to. */
  evaluationHref: string;
  /** Link to the Analytics tab for upward trace (§27.6). */
  analyticsHref: string;
  /** Selected-Program id for outcome deep links (§27.6 reverse trace). */
  programId: string;
};

export function ResponseDetail({
  response,
  evaluationHref,
  analyticsHref,
  programId,
}: ResponseDetailProps) {
  const { respondent, evaluation } = response;

  const outcomeScope =
    evaluation.type === "COURSE_BOUND"
      ? {
          evidenceSource: "COURSE" as const,
          termInstanceId: evaluation.context.termInstanceId,
        }
      : {
          evidenceSource: STAKEHOLDER_EVIDENCE_SOURCE[evaluation.context.stakeholder],
          stakeholder: evaluation.context.stakeholder,
          termInstanceId: evaluation.context.termInstanceId,
        };

  const outcomeHref = (ploId: string): string =>
    buildAnalyticsUrl(programId, { tab: "outcomes", ploId, ...outcomeScope });

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="border-border flex flex-col gap-2 border-b pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Submitted response</Badge>
          <Badge variant="secondary">Identified review</Badge>
        </div>
        <h1 className="text-heading-lg text-balance">{respondent.name}</h1>
        <p className="text-body-md text-text-secondary text-pretty">
          {respondentContextLabel(respondent) ?? "No additional respondent context"}
        </p>
      </header>

      {/* Evaluation context */}
      <Card>
        <CardHeader>
          <CardTitle>{evaluation.title}</CardTitle>
          <CardDescription>Evaluation context and submitted response summary.</CardDescription>
        </CardHeader>
        <CardContent className="text-body-sm flex flex-col gap-1">
          <p>
            <span className="text-text-muted">Submitted: </span>
            {dateTimeFormatter.format(response.submittedAt)}
          </p>
          <p>
            <span className="text-text-muted">Response mean: </span>
            <span className="font-semibold tabular-nums">
              {formatMean(response.quantitativeMean)}
            </span>
          </p>
          {evaluation.type === "COURSE_BOUND" ? (
            <CourseBoundContext context={evaluation.context} />
          ) : (
            <ProgramWideContext context={evaluation.context} />
          )}
        </CardContent>
      </Card>

      <nav aria-label="Response destinations" className="flex flex-wrap gap-2">
        <Link
          href={evaluationHref}
          className="text-label-md text-link hover:bg-muted focus-visible:ring-ring inline-flex min-h-11 items-center rounded-lg px-3 font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          View evaluation results
        </Link>
        <Link
          href={analyticsHref}
          className="text-label-md text-link hover:bg-muted focus-visible:ring-ring inline-flex min-h-11 items-center rounded-lg px-3 font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          Open Analytics
        </Link>
      </nav>

      {/* Per-section answers (§27.4–§27.5) */}
      <section className="flex flex-col gap-3">
        <h2 className="text-heading-md">Submitted answers</h2>
        {response.sections.map((section) => (
          <Card key={section.key}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {section.items.map((item) =>
                item.kind === "quantitative" ? (
                  <QuantitativeAnswerCard
                    key={item.itemKey}
                    item={item}
                    outcomeHref={outcomeHref}
                  />
                ) : (
                  <QualitativeAnswerCard key={item.promptKey} item={item} />
                )
              )}
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

function QuantitativeAnswerCard({
  item,
  outcomeHref,
}: {
  item: QuantitativeSubmittedAnswer;
  outcomeHref: (ploId: string) => string;
}) {
  const { binding } = item;
  return (
    <div className="border-border/70 flex flex-col gap-2 border-b pb-4 last:border-b-0 last:pb-0">
      <p className="text-body-md font-semibold text-pretty">{item.prompt}</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-lg font-bold tabular-nums">{item.rating}</span>
        {item.scaleLabel && <span className="text-text-muted text-sm">({item.scaleLabel})</span>}
        {binding.type === "CILO" && (
          <Badge variant="outline" className="border-info/30 bg-info-soft text-info">
            CILO: {binding.ciloLabel}
            {binding.ploMappings.length > 0 && (
              <span className="text-text-muted ml-1">
                →{" "}
                {binding.ploMappings.map((m, index) => (
                  <Fragment key={m.ploId}>
                    {index > 0 ? ", " : null}
                    <span>
                      <Link
                        href={outcomeHref(m.ploId)}
                        className="hover:text-foreground underline underline-offset-2"
                      >
                        {m.ploCode}
                      </Link>
                    </span>
                  </Fragment>
                ))}
              </span>
            )}
          </Badge>
        )}
        {binding.type === "PLO" && (
          <Badge variant="outline" className="border-success/30 bg-success-soft text-success">
            PLO:{" "}
            {binding.ploBindings.map((p, index) => (
              <Fragment key={p.key}>
                {index > 0 ? ", " : null}
                <span>
                  <Link
                    href={outcomeHref(p.key)}
                    className="hover:text-foreground underline underline-offset-2"
                  >
                    {p.code}
                  </Link>
                </span>
              </Fragment>
            ))}
          </Badge>
        )}
        {binding.type === "GENERAL" && (
          <Badge variant="outline" className="border-border text-muted-foreground">
            General evaluation item
          </Badge>
        )}
      </div>
    </div>
  );
}

function QualitativeAnswerCard({
  item,
}: {
  item: { promptKey: string; prompt: string; text: string };
}) {
  return (
    <div className="border-border bg-surface-muted rounded-lg border p-4">
      <p className="text-body-md font-semibold text-pretty">{item.prompt}</p>
      <p className="text-body-md text-text-secondary mt-2 break-words">{item.text}</p>
    </div>
  );
}

function CourseBoundContext({
  context,
}: {
  context: {
    courseCode: string;
    courseTitle: string;
    facultyName: string | null;
    periodLabel: string;
  };
}) {
  return (
    <>
      <p>
        <span className="text-text-muted">Course: </span>
        {context.courseCode} — {context.courseTitle}
      </p>
      {context.facultyName && (
        <p>
          <span className="text-text-muted">Faculty: </span>
          {context.facultyName}
        </p>
      )}
      <p>
        <span className="text-text-muted">Period: </span>
        {context.periodLabel}
      </p>
    </>
  );
}

function ProgramWideContext({
  context,
}: {
  context: { stakeholder: string; targetProgramLabel: string | null; periodLabel: string };
}) {
  return (
    <>
      <p>
        <span className="text-text-muted">Stakeholder: </span>
        {context.stakeholder}
      </p>
      {context.targetProgramLabel && (
        <p>
          <span className="text-text-muted">Target program: </span>
          {context.targetProgramLabel}
        </p>
      )}
      <p>
        <span className="text-text-muted">Period: </span>
        {context.periodLabel}
      </p>
    </>
  );
}

function respondentContextLabel(
  respondent: ProgramHeadSubmittedResponseDetail["respondent"]
): string | null {
  if (respondent.studentContext) {
    const { programLabel, majorLabel, yearLevel, section } = respondent.studentContext;
    return [programLabel, majorLabel, yearLevel, section].filter(Boolean).join(" · ");
  }
  if (respondent.alumniContext) {
    const { programLabel, majorLabel, graduationYear } = respondent.alumniContext;
    return [programLabel, majorLabel, `Class of ${graduationYear}`].filter(Boolean).join(" · ");
  }
  if (respondent.industryContext) {
    const { companyName, position } = respondent.industryContext;
    return [companyName, position].filter(Boolean).join(" — ");
  }
  return null;
}
