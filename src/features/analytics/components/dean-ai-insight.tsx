"use client";
import { useState, useTransition } from "react";
import { generateDeanAnalyticsInsightAction } from "@/lib/actions/dean-analytics-actions";
import type { DeanAnalyticsFilters } from "../services/dean-analytics-state";
import type { DeanAiResult } from "../services/dean-ai-insight";
export function DeanAiInsight({ filters }: { filters: DeanAnalyticsFilters }) {
  const [result, setResult] = useState<DeanAiResult | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <section className="bg-card text-body-sm flex flex-col gap-3 rounded-xl border p-4">
      <h2 className="text-heading-lg">AI summary</h2>
      <p className="text-text-secondary">
        Optional plain-language summary of the totals above. No names or comments are sent. The
        charts remain the source of truth, and AI cannot decide accreditation or curriculum.
      </p>
      <button
        type="button"
        disabled={pending}
        className="bg-secondary text-secondary-foreground focus-visible:outline-ring min-h-11 self-start rounded-lg px-4 focus-visible:outline-2 disabled:opacity-50"
        onClick={() =>
          startTransition(async () => setResult(await generateDeanAnalyticsInsightAction(filters)))
        }
      >
        {pending ? "Preparing interpretation…" : "Interpret current evidence"}
      </button>
      <div role="status" aria-live="polite">
        {result &&
          (!result.ok ? (
            <p>
              {result.state === "disabled"
                ? "AI is disabled or unconfigured. All analytics remain available."
                : `Interpretation unavailable (${result.state}). Continue reviewing the verified evidence or try again.`}
            </p>
          ) : result.insight ? (
            <div className="flex flex-col gap-2">
              <p>{result.insight.observation}</p>
              <ul className="list-inside list-disc">
                {result.insight.evidence.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
              <p>{result.insight.limitation}</p>
              <p>{result.insight.reviewQuestion}</p>
            </div>
          ) : (
            <p>No grounded interpretation was returned. Review the evidence directly.</p>
          ))}
      </div>
    </section>
  );
}
