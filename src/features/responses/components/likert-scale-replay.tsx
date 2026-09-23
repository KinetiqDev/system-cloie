import { cn } from "@/lib/utils";

/**
 * Read-only replay of one recorded rating. A bare number cannot be verified —
 * "3" is Neutral, Moderately Achieved, or Satisfactory depending on the scale
 * the respondent actually answered on — so the scale and its wording travel
 * with the answer.
 */
export type LikertScaleReplayProps = {
  answer: number | undefined;
  scale: number[];
  /** Descriptor wording per scale value, aligned by index. */
  descriptorLabels?: (string | null)[];
};

/** Spoken form of one recorded rating, naming the option it belongs to. */
function describeRating({ answer, scale, descriptorLabels }: LikertScaleReplayProps): string {
  if (answer === undefined) {
    return "Not answered";
  }

  const selectedIndex = scale.indexOf(answer);
  const selectedLabel = selectedIndex === -1 ? undefined : descriptorLabels?.[selectedIndex];

  return selectedLabel ? `${answer} — ${selectedLabel}` : String(answer);
}

function ratingAnnouncement(props: LikertScaleReplayProps): string {
  const { answer, scale, descriptorLabels } = props;

  if (answer === undefined) {
    return "Not answered";
  }

  const first = descriptorLabels?.[0];
  const last = descriptorLabels?.[descriptorLabels.length - 1];
  const scaleSummary =
    first && last ? `. Scale ${scale[0]} (${first}) to ${scale[scale.length - 1]} (${last})` : "";

  return `${describeRating(props)}${scaleSummary}`;
}

/**
 * Every option keeps its number and wording; the recorded choice carries the
 * primary fill. The scale itself is decorative to assistive tech and the answer
 * is announced once in words, so the meaning survives without the visual.
 */
export function LikertScaleReplay(props: LikertScaleReplayProps) {
  const { answer, scale, descriptorLabels } = props;

  if (scale.length === 0) {
    return <p className="text-body-md text-text-primary font-semibold">{describeRating(props)}</p>;
  }

  const selectedIndex = answer === undefined ? -1 : scale.indexOf(answer);

  return (
    <div className="flex flex-col gap-3">
      <span className="sr-only">Your answer: {ratingAnnouncement(props)}.</span>
      <ol
        aria-hidden="true"
        className="grid max-w-2xl gap-1.5"
        style={{ gridTemplateColumns: `repeat(${scale.length}, minmax(0, 1fr))` }}
      >
        {scale.map((value, index) => {
          const isSelected = index === selectedIndex;
          const label = descriptorLabels?.[index];

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
          chosen option is named once instead of truncated five times. */}
      {answer === undefined ? (
        <p className="text-text-muted text-body-sm">Not answered.</p>
      ) : (
        <p aria-hidden="true" className="text-label-md text-foreground sm:hidden">
          {describeRating(props)}
        </p>
      )}
    </div>
  );
}
