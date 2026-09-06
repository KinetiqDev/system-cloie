"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { QualitativeWordCloud } from "./qualitative-word-cloud";
import type { QualitativePulse } from "@/features/analytics/services/get-program-head-dashboard";

/**
 * Qualitative pulse (spec §13.10): the server already returned identifier-
 * redacted tokens capped at QUALITATIVE_TOKEN_CAP; the panel's views only
 * re-render that bounded list client-side. Raw comments stay in Responses.
 */
export function ProgramHeadQualitativePulse({
  pulse,
  feedbackHref,
}: {
  pulse: QualitativePulse;
  feedbackHref: string;
}) {
  return (
    <section aria-labelledby="qualitative-pulse-heading" className="min-w-0">
      <header className="mb-4 min-w-0">
        <CardTitle id="qualitative-pulse-heading" className="text-title-md font-bold">
          Qualitative pulse
        </CardTitle>
        <CardDescription>
          Aggregated comments with source context; raw answers stay in Responses.
        </CardDescription>
      </header>
      <div className="flex flex-col gap-4">
        <dl className="border-border grid grid-cols-1 divide-y border-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="py-3 sm:px-4 sm:first:pl-0">
            <dt className="text-muted-foreground text-label-sm font-bold tracking-wider uppercase">
              Respondents
            </dt>
            <dd className="mt-0.5 text-xl font-bold tabular-nums">
              {pulse.respondentCount.toLocaleString()}
            </dd>
          </div>
          <div className="py-3 sm:px-4">
            <dt className="text-muted-foreground text-label-sm font-bold tracking-wider uppercase">
              Qualitative answers
            </dt>
            <dd className="mt-0.5 text-xl font-bold tabular-nums">
              {pulse.answerCount.toLocaleString()}
            </dd>
          </div>
          <div className="py-3 sm:px-4 sm:last:pr-0">
            <dt className="text-muted-foreground text-label-sm font-bold tracking-wider uppercase">
              Evaluations
            </dt>
            <dd className="mt-0.5 text-xl font-bold tabular-nums">
              {pulse.evaluationCount.toLocaleString()}
            </dd>
          </div>
        </dl>

        {pulse.sourceCounts.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="Answers per evidence source">
            {pulse.sourceCounts.map((source) => (
              <li key={source.sourceKey}>
                <Badge variant="secondary">
                  {source.label}: {source.count.toLocaleString()}
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}

        {pulse.answerCount === 0 ? (
          <Empty>
            <EmptyTitle>No qualitative answers were submitted</EmptyTitle>
            <EmptyDescription>
              Comments appear here once respondents answer open-text prompts.
            </EmptyDescription>
          </Empty>
        ) : (
          <QualitativeWordCloud
            title="Frequent terms"
            tokens={pulse.tokens}
            answerCount={pulse.answerCount}
          />
        )}

        <Link
          href={feedbackHref}
          className="text-link text-label-md inline-flex items-center gap-1 self-start font-semibold hover:underline"
        >
          Open qualitative analysis
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
