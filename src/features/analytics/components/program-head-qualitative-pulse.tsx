"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { QualitativeWordCloud } from "./qualitative-word-cloud";
import type { QualitativePulse } from "@/features/analytics/services/get-program-head-dashboard";

const MIN_WORDS = 10;
const MAX_WORDS = 60;
const WORD_STEP = 5;
const DEFAULT_WORDS = 30;

/**
 * Qualitative pulse (spec §13.10): the server already returned identifier-
 * redacted tokens capped at QUALITATIVE_TOKEN_CAP; the slider only re-slices
 * that bounded list client-side. Raw comments stay in Responses.
 */
export function ProgramHeadQualitativePulse({
  pulse,
  feedbackHref,
}: {
  pulse: QualitativePulse;
  feedbackHref: string;
}) {
  const [visibleWords, setVisibleWords] = useState(DEFAULT_WORDS);
  const visibleTokens = pulse.tokens.slice(0, visibleWords);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base font-bold">Qualitative pulse</CardTitle>
            <CardDescription>
              Aggregated comments with source context; raw answers stay in Responses.
            </CardDescription>
          </div>
          <label className="text-muted-foreground flex items-center gap-2 text-label-sm font-semibold">
            Top{" "}
            <input
              type="range"
              min={MIN_WORDS}
              max={MAX_WORDS}
              step={WORD_STEP}
              value={Math.min(visibleWords, Math.max(pulse.tokens.length, MIN_WORDS))}
              onChange={(event) => setVisibleWords(Number(event.target.value))}
              disabled={pulse.tokens.length === 0}
              aria-label={`Number of top words shown: ${visibleTokens.length}`}
              className="accent-primary w-36"
            />
            <span className="tabular-nums text-foreground">{visibleTokens.length}</span> words
          </label>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border px-3 py-2">
            <dt className="text-muted-foreground text-label-sm font-bold tracking-wider uppercase">
              Respondents
            </dt>
            <dd className="tabular-nums mt-0.5 text-xl font-bold">
              {pulse.respondentCount.toLocaleString()}
            </dd>
          </div>
          <div className="rounded-lg border px-3 py-2">
            <dt className="text-muted-foreground text-label-sm font-bold tracking-wider uppercase">
              Qualitative answers
            </dt>
            <dd className="tabular-nums mt-0.5 text-xl font-bold">
              {pulse.answerCount.toLocaleString()}
            </dd>
          </div>
          <div className="rounded-lg border px-3 py-2">
            <dt className="text-muted-foreground text-label-sm font-bold tracking-wider uppercase">
              Evaluations
            </dt>
            <dd className="tabular-nums mt-0.5 text-xl font-bold">
              {pulse.evaluationCount.toLocaleString()}
            </dd>
          </div>
        </dl>

        {pulse.sourceCounts.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Answers per evidence source">
            {pulse.sourceCounts.map((source) => (
              <li key={source.sourceKey}>
                <Badge variant="secondary">
                  {source.label}: {source.count.toLocaleString()}
                </Badge>
              </li>
            ))}
          </ul>
        )}

        {pulse.answerCount === 0 ? (
          <Empty>
            <EmptyTitle>No qualitative answers were submitted</EmptyTitle>
            <EmptyDescription>
              Comments appear here once respondents answer open-text prompts.
            </EmptyDescription>
          </Empty>
        ) : (
          <QualitativeWordCloud
            title="Qualitative pulse"
            tokens={visibleTokens}
            responseCount={pulse.respondentCount}
          />
        )}

        <Link
          href={feedbackHref}
          className="text-link inline-flex items-center gap-1 self-start text-xs font-semibold hover:underline"
        >
          Open qualitative analysis
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}
