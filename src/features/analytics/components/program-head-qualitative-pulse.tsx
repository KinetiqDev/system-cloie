import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { LazyQualitativeWordCloud } from "./program-head-analytics-visualizations";
import type { QualitativePulse } from "@/features/analytics/services/get-program-head-dashboard";

export function ProgramHeadQualitativePulse({
  pulse,
  feedbackHref,
}: {
  pulse: QualitativePulse;
  feedbackHref: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="text-body-sm text-text-secondary tabular-nums">
        {pulse.answerCount === 0
          ? "No written answers yet."
          : `${pulse.answerCount.toLocaleString()} ${pulse.answerCount === 1 ? "answer" : "answers"} from ${pulse.respondentCount.toLocaleString()} ${pulse.respondentCount === 1 ? "respondent" : "respondents"}`}
      </p>
      <LazyQualitativeWordCloud
        title="Written feedback"
        tokens={pulse.tokens}
        answerCount={pulse.answerCount}
      />
      <Link
        href={feedbackHref}
        className="text-link text-label-lg focus-visible:ring-ring inline-flex items-center gap-0.5 self-start rounded-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none pointer-coarse:min-h-11"
      >
        Open qualitative analysis
        <ChevronRight aria-hidden="true" className="size-4" />
      </Link>
    </div>
  );
}
