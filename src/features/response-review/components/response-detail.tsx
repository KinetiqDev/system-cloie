import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMean } from "./format";
import { buildAnalyticsUrl } from "@/features/analytics/services/program-head-analytics-state";
import type { TargetStakeholder } from "@prisma/client";
import type { ProgramHeadSubmittedResponseDetail, QuantitativeSubmittedAnswer } from "../types";

type ResponseDetailProps = {
  response: ProgramHeadSubmittedResponseDetail;
  /** Link back to the evaluation detail page this response belongs to. */
  evaluationHref: string;
  /** Link to the Analytics tab for upward trace (§27.6). */
  analyticsHref: string;
  /** Selected-Program id for outcome deep links (§27.6 reverse trace). */
  programId: string;
};

const STAKEHOLDER_SOURCE: Record<TargetStakeholder, "PROGRAM_WIDE_STUDENT" | "ALUMNI" | "INDUSTRY"> = {
  STUDENT: "PROGRAM_WIDE_STUDENT",
  ALUMNI: "ALUMNI",
  INDUSTRY_PARTNER: "INDUSTRY",
};

export function ResponseDetail({ response, evaluationHref, analyticsHref, programId }: ResponseDetailProps) {
  const { respondent, evaluation } = response;

  const outcomeScope =
    evaluation.type === "COURSE_BOUND"
      ? ({ evidenceSource: "COURSE" as const })
      : ({
          evidenceSource: STAKEHOLDER_SOURCE[evaluation.context.stakeholder],
          stakeholder: evaluation.context.stakeholder,
        });

  const outcomeHref = (ploId: string): string =>
    buildAnalyticsUrl(programId, { tab: "outcomes", ploId, ...outcomeScope });

  return (
    <div className="space-y-6">
      {/* Respondent identity (§27.1–§27.3) */}
      <section className="space-y-1">
        <h1 className="text-2xl font-bold">{respondent.name}</h1>
        <p className="text-text-muted text-sm">{respondentContextLabel(respondent) ?? ""}</p>
      </section>

      {/* Evaluation context */}
      <Card>
        <CardHeader>
          <CardTitle>{evaluation.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-text-muted">Submitted: </span>
            {response.submittedAt.toLocaleString()}
          </p>
          <p>
            <span className="text-text-muted">Response mean: </span>
            <span className="font-semibold tabular-nums">{formatMean(response.quantitativeMean)}</span>
          </p>
          {evaluation.type === "COURSE_BOUND" ? (
            <CourseBoundContext context={evaluation.context} />
          ) : (
            <ProgramWideContext context={evaluation.context} />
          )}
        </CardContent>
      </Card>

      {/* Upward trace (§27.6) */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={evaluationHref}
          className="text-link text-sm underline-offset-4 hover:underline"
        >
          View evaluation results
        </Link>
        <Link
          href={analyticsHref}
          className="text-link text-sm underline-offset-4 hover:underline"
        >
          Open Analytics
        </Link>
      </div>

      {/* Per-section answers (§27.4–§27.5) */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Submitted Answers</h2>
        {response.sections.map((section) => (
          <Card key={section.key}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.items.map((item) =>
                item.kind === "quantitative" ? (
                  <QuantitativeAnswerCard key={item.itemKey} item={item} outcomeHref={outcomeHref} />
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
    <div className="space-y-1">
      <p className="text-sm font-semibold">{item.prompt}</p>
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
                  <span key={m.ploId}>
                    {index > 0 ? ", " : null}
                    <Link
                      href={outcomeHref(m.ploId)}
                      className="hover:text-foreground underline underline-offset-2"
                    >
                      {m.ploCode}
                    </Link>
                  </span>
                ))}
              </span>
            )}
          </Badge>
        )}
        {binding.type === "PLO" && (
          <Badge variant="outline" className="border-success/30 bg-success-soft text-success">
            PLO:{" "}
            {binding.ploBindings.map((p, index) => (
              <span key={p.key}>
                {index > 0 ? ", " : null}
                <Link
                  href={outcomeHref(p.key)}
                  className="hover:text-foreground underline underline-offset-2"
                >
                  {p.code}
                </Link>
              </span>
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

function QualitativeAnswerCard({ item }: { item: { promptKey: string; prompt: string; text: string } }) {
  return (
    <div className="border-border rounded-md border p-3">
      <p className="text-sm font-semibold">{item.prompt}</p>
      <p className="text-text-muted mt-1 text-sm">{item.text}</p>
    </div>
  );
}

function CourseBoundContext({ context }: { context: { courseCode: string; courseTitle: string; facultyName: string | null; periodLabel: string } }) {
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

function ProgramWideContext({ context }: { context: { stakeholder: string; targetProgramLabel: string | null; periodLabel: string } }) {
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

function respondentContextLabel(respondent: ProgramHeadSubmittedResponseDetail["respondent"]): string | null {
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