import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import type {
  SubmittedResponseItem,
  SubmittedResponseSection,
} from "@/features/responses/services/get-student-submitted-response-review";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils/date-format";

interface SubmittedResponseReviewProps {
  evaluationTitle: string;
  courseTitle: string | null;
  programLabel: string;
  submittedAt: Date;
  sections: SubmittedResponseSection[];
}

type QuantitativeItem = Extract<SubmittedResponseItem, { kind: "quantitative" }>;

function countAnswers(sections: SubmittedResponseSection[]) {
  return sections.reduce(
    (totals, section) => {
      for (const item of section.items) {
        if (item.answer === undefined) {
          continue;
        }

        if (item.kind === "quantitative") {
          totals.ratings += 1;
        } else {
          totals.written += 1;
        }
      }

      return totals;
    },
    { ratings: 0, written: 0 }
  );
}

/**
 * Spoken form of one replayed rating: the number alone is meaningless without
 * the scale it belongs to, so the name of the chosen option travels with it.
 */
function describeRating(item: QuantitativeItem): string {
  if (item.answer === undefined) {
    return "Not answered";
  }

  const selectedIndex = item.scale.indexOf(item.answer);
  const selectedLabel = selectedIndex === -1 ? undefined : item.descriptorLabels?.[selectedIndex];

  return selectedLabel ? `${item.answer} — ${selectedLabel}` : String(item.answer);
}

function ratingAnnouncement(item: QuantitativeItem): string {
  if (item.answer === undefined) {
    return "Not answered";
  }

  const descriptors = item.descriptorLabels ?? [];
  const first = descriptors[0];
  const last = descriptors[descriptors.length - 1];
  const scaleSummary =
    first && last
      ? `. Scale ${item.scale[0]} (${first}) to ${item.scale[item.scale.length - 1]} (${last})`
      : "";

  return `${describeRating(item)}${scaleSummary}`;
}

/**
 * Read-only replay of the rating scale the respondent answered on: every option
 * is shown with its own wording, and the recorded choice carries the fill.
 */
function LikertScaleReplay({ item }: { item: QuantitativeItem }) {
  const selectedIndex = item.answer === undefined ? -1 : item.scale.indexOf(item.answer);

  if (item.scale.length === 0) {
    return <p className="text-body-md text-text-primary font-semibold">{describeRating(item)}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Read-only replay of the scale: every option keeps its own wording, and
          the recorded choice carries the fill. The list stays a real list for
          assistive tech; the answer is announced once in words. */}
      <span className="sr-only">Your answer: {ratingAnnouncement(item)}.</span>
      <ol
        aria-hidden="true"
        className="grid max-w-2xl gap-1.5"
        style={{ gridTemplateColumns: `repeat(${item.scale.length}, minmax(0, 1fr))` }}
      >
        {item.scale.map((value, index) => {
          const isSelected = index === selectedIndex;
          const label = item.descriptorLabels?.[index];

          return (
            <li key={value} className="flex min-w-0 flex-col items-center gap-1.5">
              <span
                className={cn(
                  "text-label-lg flex w-full items-center justify-center rounded-md border py-1.5 tabular-nums",
                  isSelected
                    ? "border-primary bg-primary text-on-primary"
                    : "border-border bg-surface text-text-secondary"
                )}
              >
                {value}
              </span>
              {label && (
                <span
                  className={cn(
                    "hidden max-w-full text-center leading-tight [overflow-wrap:anywhere] sm:block",
                    isSelected ? "text-label-sm text-foreground" : "text-caption text-text-muted"
                  )}
                >
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {/* Below sm the five columns are too narrow for descriptor text, so the
          chosen option is named once instead of truncated five times. The
          scale above already announces this answer to assistive tech. */}
      {item.answer === undefined ? (
        <p className="text-text-muted text-body-sm">Not answered.</p>
      ) : (
        <p aria-hidden="true" className="text-label-md text-foreground sm:hidden">
          {describeRating(item)}
        </p>
      )}
    </div>
  );
}

function QuantitativeAnswerRow({ item }: { item: QuantitativeItem }) {
  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <p className="text-title-md text-foreground text-pretty">{item.prompt}</p>
      <LikertScaleReplay item={item} />
    </li>
  );
}

function QualitativeAnswerRow({
  item,
}: {
  item: Extract<SubmittedResponseItem, { kind: "qualitative" }>;
}) {
  return (
    <li className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
      <p className="text-title-md text-foreground text-pretty">{item.prompt}</p>
      {item.answer === undefined ? (
        <p className="text-text-muted text-body-sm">Not answered.</p>
      ) : (
        <p className="bg-surface-muted text-text-secondary text-body-sm max-w-prose rounded-lg p-3 [overflow-wrap:anywhere] whitespace-pre-line">
          {item.answer}
        </p>
      )}
    </li>
  );
}

export function SubmittedResponseReview({
  evaluationTitle,
  courseTitle,
  programLabel,
  submittedAt,
  sections,
}: SubmittedResponseReviewProps) {
  const { ratings, written } = countAnswers(sections);
  const submittedLabel = formatDateTime(submittedAt);

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in flex flex-col gap-6 motion-safe:duration-500">
      <header className="flex flex-col gap-3">
        <Badge variant="success" className="uppercase">
          <CheckCircle2 data-icon="inline-start" aria-hidden="true" />
          Submitted
        </Badge>
        <div className="flex flex-col gap-1">
          <h1 className="text-heading-xl text-balance">{evaluationTitle}</h1>
          <p className="text-body-sm text-text-secondary text-pretty">
            {courseTitle ? `${courseTitle} • ${programLabel}` : programLabel}
          </p>
        </div>
        <p className="text-body-sm text-text-secondary tabular-nums">
          Submitted on <time dateTime={submittedAt.toISOString()}>{submittedLabel}</time> •{" "}
          {ratings} {ratings === 1 ? "rating" : "ratings"} • {written} written{" "}
          {written === 1 ? "answer" : "answers"}
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {sections.map((section) => (
          <Card key={section.id} className="gap-4 py-5">
            <CardHeader className="px-4 sm:px-5">
              <h2 className="text-heading-md text-foreground">{section.name}</h2>
              {section.description && <CardDescription>{section.description}</CardDescription>}
            </CardHeader>
            <CardContent className="px-4 sm:px-5">
              <ul className="divide-border flex flex-col divide-y">
                {section.items.map((item) => {
                  const itemKey = item.kind === "quantitative" ? item.itemKey : item.promptKey;

                  return item.kind === "quantitative" ? (
                    <QuantitativeAnswerRow key={itemKey} item={item} />
                  ) : (
                    <QualitativeAnswerRow key={itemKey} item={item} />
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="border-border bg-surface-muted flex items-start gap-3 rounded-xl border p-4">
        <CheckCircle2 className="text-success mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="text-title-sm text-foreground">Your response has been recorded</p>
          <p className="text-body-sm text-text-secondary text-pretty">
            This record is read-only. Submitted responses are final and cannot be edited.
          </p>
        </div>
      </div>
    </div>
  );
}
