import type { QualitativeToneShape, WordCloudToken } from "@/features/analytics/types";

/**
 * Deterministic tone distribution (ADR 0023). Both the Program Head and Faculty
 * surfaces render the same counts and the same rule disclosure: the rule is a
 * fixed word list over the answers as submitted, so the copy states its limits
 * rather than implying a human judgement.
 */
export function QualitativeToneSummary({ tone }: { tone: QualitativeToneShape }) {
  const bands = [
    { label: "Positive", value: tone.positive },
    { label: "Neutral", value: tone.neutral },
    { label: "Negative", value: tone.negative },
  ];

  return (
    <section aria-labelledby="qualitative-tone-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 id="qualitative-tone-title" className="text-title-sm text-foreground">
          Answer tone
        </h3>
        <p className="text-body-sm text-text-secondary">
          {tone.scoredItemCount === 0
            ? "No answer carried enough words for the tone rule to score."
            : `${tone.scoredItemCount} ${tone.scoredItemCount === 1 ? "answer" : "answers"} scored by a fixed word list: positive above +0.2, negative below −0.2, neutral in between. An answer that mixes praise and criticism counts once, and the list can miss sarcasm, unusual phrasing, and some negations.`}
        </p>
      </div>
      <dl className="border-border grid grid-cols-3 gap-3 rounded-lg border p-4">
        {bands.map((band) => (
          <div key={band.label} className="flex flex-col gap-1">
            <dt className="text-label-sm text-text-secondary">{band.label}</dt>
            <dd className="text-heading-md tabular-nums">{band.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Identifier-redacted prompt terms with their mention counts and respondent reach. */
export function QualitativeTermChips({ terms, label }: { terms: WordCloudToken[]; label: string }) {
  if (terms.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={label}>
      {terms.map((term) => (
        <li
          key={term.text}
          aria-label={
            typeof term.responseCount === "number"
              ? `${term.text}: ${term.value} mentions in ${term.responseCount} responses`
              : undefined
          }
          className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-xs"
        >
          {term.text} · {term.value}
        </li>
      ))}
    </ul>
  );
}
