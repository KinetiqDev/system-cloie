import Link from "next/link";
import type { StudentEvaluationListItem } from "@/features/responses/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type EvaluationListCardProps = StudentEvaluationListItem;

export function EvaluationListCard({
  courseTitle,
  deadlineAt,
  deploymentType,
  evaluationTitle,
  facultyName,
  href,
  programLabel,
  progress,
  status,
}: EvaluationListCardProps) {
  const isResuming = status === "IN_PROGRESS";
  const isSubmitted = status === "SUBMITTED";
  const deadline = deadlineAt
    ? deadlineAt.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "No deadline";

  return (
    <div className="group border-border bg-surface hover:border-primary/30 rounded-xl border p-5 shadow-sm transition-colors">
      <div className="flex flex-col justify-between gap-4 md:flex-row">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant={status === "DUE_SOON" ? "warning" : "outline"} className="uppercase">
              {status === "DUE_SOON" ? "Closing Soon" : `Deadline: ${deadline}`}
            </Badge>
          </div>

          <h4
            className="group-hover:text-primary mb-1 line-clamp-2 text-lg font-bold transition-colors"
            title={evaluationTitle}
          >
            {evaluationTitle}
          </h4>

          {deploymentType === "COURSE_BOUND" && courseTitle ? (
            <>
              <p className="text-text-secondary truncate text-sm font-medium">{courseTitle}</p>
              {facultyName && (
                <p className="text-text-muted mt-0.5 text-sm">Published by {facultyName}</p>
              )}
            </>
          ) : (
            <p className="text-text-secondary truncate text-sm font-medium">{programLabel}</p>
          )}
          <p className="text-text-muted mt-1 text-xs font-semibold tracking-wide uppercase">
            {deploymentType === "CENTRAL" ? "Central Deployment" : "Course-Bound Evaluation"}
          </p>
        </div>

        <div className="flex shrink-0 flex-col justify-center gap-2 md:items-end">
          {isResuming && (
            <div className="w-full space-y-1.5 md:w-48">
              <div className="text-text-muted flex items-center justify-between text-xs font-bold">
                <span className="text-secondary">{progress}% Complete</span>
              </div>
              <Progress
                value={progress}
                className="h-1.5"
                aria-label={`Evaluation progress: ${progress}%`}
              />
            </div>
          )}
          <Button
            disabled={!href}
            render={href ? <Link href={href} /> : undefined}
            className="mt-2 min-h-11 w-full font-bold md:w-auto"
          >
            {isSubmitted ? "View Answers" : isResuming ? "Resume" : "Start Evaluation"}
          </Button>
        </div>
      </div>
    </div>
  );
}
