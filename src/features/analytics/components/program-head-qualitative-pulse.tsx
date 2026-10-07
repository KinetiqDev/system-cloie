import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { QualitativeTermChips } from "./qualitative-evidence";
import type { QualitativePulse } from "@/features/analytics/services/get-program-head-dashboard";

const DASHBOARD_TERM_COUNT = 12;

/**
 * Qualitative pulse (spec §13.10): aggregate counts and the most-mentioned
 * identifier-redacted terms. The interactive word cloud lives on Analytics >
 * Qualitative; raw comments stay in Responses.
 */
export function ProgramHeadQualitativePulse({
  pulse,
  feedbackHref,
}: {
  pulse: QualitativePulse;
  feedbackHref: string;
}) {
  return (
    <Card className="gap-3">
      <CardHeader className="gap-1">
        <h2 className="text-heading-lg">Written feedback</h2>
        <p className="text-body-sm text-text-secondary tabular-nums">
          {pulse.answerCount === 0
            ? "No written answers yet."
            : `${pulse.answerCount.toLocaleString()} ${pulse.answerCount === 1 ? "answer" : "answers"} from ${pulse.respondentCount.toLocaleString()} ${pulse.respondentCount === 1 ? "respondent" : "respondents"}`}
        </p>
      </CardHeader>
      {pulse.tokens.length > 0 && (
        <CardContent className="flex flex-col gap-3">
          <QualitativeTermChips
            terms={pulse.tokens.slice(0, DASHBOARD_TERM_COUNT)}
            label="Most-mentioned terms"
          />
          <Link
            href={feedbackHref}
            className="text-link text-label-lg focus-visible:ring-ring inline-flex items-center gap-0.5 self-start rounded-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none pointer-coarse:min-h-11"
          >
            Open qualitative analysis
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        </CardContent>
      )}
    </Card>
  );
}
