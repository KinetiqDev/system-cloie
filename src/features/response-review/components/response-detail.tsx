import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMean } from "./format";
import { LikertScaleReplay } from "@/features/responses/components/likert-scale-replay";
import { formatOutcomeAlignment } from "./response-review-labels";
import type {
  IdentifiedSubmittedResponseDetail,
  QuantitativeSubmittedAnswer,
  SubmittedAnswerBinding,
  SubmittedCiloAnswerBinding,
} from "../types";
import { getSectionLabel, getYearLevelDisplay } from "@/lib/constants/academic";
import { formatDateTime } from "@/lib/utils/date-format";

type ResponseDetailProps = {
  response: IdentifiedSubmittedResponseDetail;
  /** Link back to the evaluation detail page this response belongs to. */
  evaluationHref: string;
  /** Link to the Analytics tab for upward trace (§27.6). */
  analyticsHref: string;
  /**
   * Outcome deep links (§27.6 reverse trace). The id is whichever typed
   * alignment the answer actually carries: a PO id for Program-specific and
   * Central evidence, an ILO id for General Education. Each role resolves it
   * against its own Analytics workspace, so no href crosses role scopes.
   */
  outcomeHref: (outcomeId: string, response: IdentifiedSubmittedResponseDetail) => string;
  /** Trail rendered directly below the page title (§12). */
  breadcrumbs?: ReactNode;
};

export function ResponseDetail({
  response,
  evaluationHref,
  analyticsHref,
  outcomeHref,
  breadcrumbs,
}: ResponseDetailProps) {
  const { respondent, evaluation } = response;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="border-border flex flex-col gap-2 border-b pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Submitted response</Badge>
          <Badge variant="secondary">Identified review</Badge>
        </div>
        <h1 className="text-heading-xl text-balance wrap-anywhere">{respondent.name}</h1>
        {breadcrumbs ? <div className="pt-1">{breadcrumbs}</div> : null}
        <p className="text-body-md text-text-secondary text-pretty">
          {respondentContextLabel(respondent) ?? "No additional respondent context"}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{evaluation.title}</CardTitle>
          <CardDescription>Evaluation context and submitted response summary.</CardDescription>
        </CardHeader>
        <CardContent className="text-body-sm grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ContextFact label="Submitted" value={formatDateTime(response.submittedAt)} />
          <ContextFact
            label="Response Quantitative Mean"
            value={formatMean(response.quantitativeMean)}
            description="Calculated from all valid quantitative answers in this submitted response."
          />
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
                    outcomeHref={(poId) => outcomeHref(poId, response)}
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

const OUTCOME_LINK_CLASS = "hover:text-foreground font-medium underline underline-offset-2";
const BINDING_BADGE_CLASS =
  "h-auto max-w-full justify-start py-1 text-left text-xs leading-relaxed break-words whitespace-normal";
const ALIGNMENT_ROW_CLASS = "text-text-muted ml-1 inline-flex flex-wrap items-center gap-1";

function CiloLabel({ label }: { label: string }) {
  return (
    <span>
      <span className="font-semibold">CILO:</span> {label}
    </span>
  );
}

/**
 * Comma-separated outcome deep links, each resolving to the workspace that
 * owns that outcome for the role reading this response. Renders nothing when
 * the binding carries no alignment, so an unaligned CILO shows its label
 * alone instead of a dangling arrow.
 */
function OutcomeLinks({
  className,
  lead,
  entries,
  outcomeHref,
}: {
  lead?: string;
  className?: string;
  entries: Array<{ key: string; label: ReactNode }>;
  outcomeHref: (outcomeId: string) => string;
}) {
  if (entries.length === 0) return null;
  return (
    <span className={className}>
      {lead ? <span>{lead}</span> : null}
      {entries.map((entry, index) => (
        <Fragment key={entry.key}>
          {index > 0 ? ", " : null}
          <span>
            <Link href={outcomeHref(entry.key)} className={OUTCOME_LINK_CLASS}>
              {entry.label}
            </Link>
          </span>
        </Fragment>
      ))}
    </span>
  );
}

// General Education: the CILO reaches Institutional Learning Outcomes only, so
// each alignment links into the Coordinator's own Analytics workspace for that
// ILO in this response's period.
function IloAlignmentBadge({
  binding,
  outcomeHref,
}: {
  binding: Extract<SubmittedCiloAnswerBinding, { layer: "INSTITUTIONAL_OUTCOME" }>;
  outcomeHref: (outcomeId: string) => string;
}) {
  return (
    <Badge
      variant="outline"
      className={`border-info/30 bg-info-soft text-info ${BINDING_BADGE_CLASS}`}
    >
      <CiloLabel label={binding.ciloLabel} />
      <OutcomeLinks
        className={ALIGNMENT_ROW_CLASS}
        entries={binding.iloMappings.map((mapping) => ({
          key: mapping.iloId,
          label: formatOutcomeAlignment({
            outcomeId: mapping.iloId,
            outcomeCode: mapping.iloCode,
            manifestation: mapping.manifestation,
          }),
        }))}
        outcomeHref={outcomeHref}
      />
    </Badge>
  );
}

function CiloGoBadge({
  binding,
  outcomeHref,
}: {
  binding: Extract<SubmittedCiloAnswerBinding, { layer: "GRADUATE_OUTCOME" }>;
  outcomeHref: (outcomeId: string) => string;
}) {
  return (
    <Badge
      variant="outline"
      className={`border-info/30 bg-info-soft text-info ${BINDING_BADGE_CLASS}`}
    >
      <CiloLabel label={binding.ciloLabel} />
      <OutcomeLinks
        className={ALIGNMENT_ROW_CLASS}
        entries={binding.poMappings.map((mapping) => ({
          key: mapping.poId,
          label: mapping.poCode,
        }))}
        outcomeHref={outcomeHref}
      />
      <OutcomeLinks
        className={ALIGNMENT_ROW_CLASS}
        entries={binding.directPoBindings.map((po) => ({ key: po.key, label: po.code }))}
        outcomeHref={outcomeHref}
      />
    </Badge>
  );
}

function PoBadge({
  poBindings,
  outcomeHref,
}: {
  poBindings: Extract<SubmittedAnswerBinding, { type: "PO" }>["poBindings"];
  outcomeHref: (outcomeId: string) => string;
}) {
  return (
    <Badge
      variant="outline"
      className={`border-success/30 bg-success-soft text-success ${BINDING_BADGE_CLASS}`}
    >
      <span>
        <span className="font-semibold">PO:</span>{" "}
        <OutcomeLinks
          className="inline-flex flex-wrap items-center gap-1"
          entries={poBindings.map((po) => ({ key: po.key, label: po.code }))}
          outcomeHref={outcomeHref}
        />
      </span>
    </Badge>
  );
}

/**
 * Which alignment badge an answer carries. `binding.type`/`binding.layer`
 * discriminate the typed layer rather than inferring it from wording, so a
 * General Education answer can never render a PO link.
 */
function AnswerBindingBadges({
  binding,
  outcomeHref,
}: {
  binding: SubmittedAnswerBinding;
  outcomeHref: (outcomeId: string) => string;
}) {
  if (binding.type === "GENERAL") {
    return (
      <Badge variant="outline" className="border-border text-muted-foreground">
        General evaluation item
      </Badge>
    );
  }
  if (binding.type === "PO") {
    return <PoBadge poBindings={binding.poBindings} outcomeHref={outcomeHref} />;
  }
  return binding.layer === "INSTITUTIONAL_OUTCOME" ? (
    <IloAlignmentBadge binding={binding} outcomeHref={outcomeHref} />
  ) : (
    <CiloGoBadge binding={binding} outcomeHref={outcomeHref} />
  );
}

function QuantitativeAnswerCard({
  item,
  outcomeHref,
}: {
  item: QuantitativeSubmittedAnswer;
  outcomeHref: (poId: string) => string;
}) {
  return (
    <div className="border-border/70 flex flex-col gap-2 border-b pb-4 last:border-b-0 last:pb-0">
      <p className="text-body-md font-semibold text-pretty">{item.prompt}</p>
      <LikertScaleReplay
        answer={item.rating}
        scale={item.scale}
        descriptorLabels={item.descriptorLabels}
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <AnswerBindingBadges binding={item.binding} outcomeHref={outcomeHref} />
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

function ContextFact({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-label-sm text-muted-foreground">{label}</span>
      <span className="font-semibold break-words tabular-nums">{value}</span>
      {description ? (
        <span className="text-caption text-muted-foreground text-pretty">{description}</span>
      ) : null}
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
      <ContextFact label="Course" value={`${context.courseCode} — ${context.courseTitle}`} />
      {context.facultyName ? <ContextFact label="Faculty" value={context.facultyName} /> : null}
      <ContextFact label="Academic Period" value={context.periodLabel} />
    </>
  );
}

function ProgramWideContext({
  context,
}: {
  context: { stakeholder: string; targetProgramLabel: string | null; periodLabel: string };
}) {
  const stakeholder = context.stakeholder
    .replaceAll("_", " ")
    .toLocaleLowerCase()
    .replace(/\b\w/g, (character) => character.toLocaleUpperCase());
  return (
    <>
      <ContextFact label="Stakeholder" value={stakeholder} />
      {context.targetProgramLabel ? (
        <ContextFact label="Target Program" value={context.targetProgramLabel} />
      ) : null}
      <ContextFact label="Academic Period" value={context.periodLabel} />
    </>
  );
}

function respondentContextLabel(
  respondent: IdentifiedSubmittedResponseDetail["respondent"]
): string | null {
  if (respondent.studentContext) {
    const { programLabel, majorLabel, yearLevel, section } = respondent.studentContext;
    return [programLabel, majorLabel, getYearLevelDisplay(yearLevel), getSectionLabel(section)]
      .filter((part) => part && part !== "—")
      .join(" · ");
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
