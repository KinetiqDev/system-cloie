"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getYearLevelDisplay } from "@/lib/constants/year-levels";
import { getStatusVariant } from "./evaluation-status";
import type { FacultyEvaluationDetail } from "../types";
import type {
  LateIncludeCourseBoundEvaluationInput,
  LateIncludeCourseBoundEvaluationResult,
} from "../types";
import { LateIncludeDialog } from "./late-include-dialog";

interface EvaluationDetailDialogProps {
  detail: FacultyEvaluationDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lateIncludeAction?: (
    payload: LateIncludeCourseBoundEvaluationInput
  ) => Promise<LateIncludeCourseBoundEvaluationResult>;
}

function getScopeLabel(scope: string): string {
  return scope
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(date: Date | string | null): string {
  if (!date) return "--";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EvaluationDetailDialog({
  detail,
  open,
  onOpenChange,
  lateIncludeAction,
}: EvaluationDetailDialogProps) {
  if (!detail) return null;

  const bindingByCiloId = new Map(
    detail.templateBindings.filter((b) => b.ciloId).map((binding) => [binding.ciloId, binding])
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{detail.deploymentName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {lateIncludeAction && detail.lateInclusionOpen && (
            <LateIncludeDialog
              action={lateIncludeAction}
              evaluationId={detail.evaluationId}
              exclusions={detail.exclusions}
              status={detail.status}
            />
          )}
          {/* Status & Academic Period */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getStatusVariant(detail.status)}>
              {detail.status.charAt(0) + detail.status.slice(1).toLowerCase()}
            </Badge>
            <span className="text-muted-foreground text-sm">{detail.termInstanceLabel}</span>
          </div>

          {/* Course Info */}
          <div className="rounded-lg border p-4">
            <h4 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
              Course Information
            </h4>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Course:</span>
                <span className="font-medium">
                  {detail.courseInfo.courseCode} - {detail.courseInfo.courseTitle}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scope:</span>
                <span className="font-medium">{getScopeLabel(detail.courseInfo.courseScope)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Program:</span>
                <span className="font-medium">
                  {detail.courseInfo.programCode} - {detail.courseInfo.programName}
                </span>
              </div>
              {detail.courseInfo.majorName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Major:</span>
                  <span className="font-medium">{detail.courseInfo.majorName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-lg border p-4">
            <h4 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
              Timeline
            </h4>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Published:</span>
                <span className="font-medium">{formatDate(detail.publishedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Activation:</span>
                <span className="font-medium">
                  {detail.activationAt ? formatDate(detail.activationAt) : "Immediate"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deadline:</span>
                <span className="font-medium">
                  {detail.deadlineAt ? formatDate(detail.deadlineAt) : "No deadline"}
                </span>
              </div>
            </div>
          </div>

          {/* Response Progress */}
          <div className="rounded-lg border p-4">
            <h4 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
              Response Progress
            </h4>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="mb-2 flex justify-between text-sm">
                  <span>Completed</span>
                  <span className="font-medium">
                    {detail.responseCount} / {detail.totalAssignments}
                  </span>
                </div>
                <div className="bg-muted h-2 rounded-full">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width:
                        detail.totalAssignments > 0
                          ? `${(detail.responseCount / detail.totalAssignments) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {detail.totalAssignments > 0
                    ? Math.round((detail.responseCount / detail.totalAssignments) * 100)
                    : 0}
                  %
                </div>
                <div className="text-muted-foreground text-xs">completion rate</div>
              </div>
            </div>
          </div>

          {/* Target Year Levels */}
          <div className="rounded-lg border p-4">
            <h4 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
              Target Year Levels
            </h4>
            <div className="flex flex-wrap gap-2">
              {detail.targets.length === 0 ? (
                <span className="text-muted-foreground text-sm">No specific targets</span>
              ) : (
                detail.targets.map((target, index) => (
                  <Badge key={index} variant="outline">
                    {target.yearLevel ? getYearLevelDisplay(target.yearLevel) : "All Year Levels"}
                  </Badge>
                ))
              )}
            </div>
          </div>

          {/* CILO Bindings */}
          <div className="space-y-3">
            <h4 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
              CILO Question Bindings
            </h4>
            {detail.cilos.length === 0 ? (
              <p className="text-muted-foreground text-sm">No CILOs mapped.</p>
            ) : (
              <ol className="space-y-3">
                {detail.cilos.map((cilo, index) => {
                  const binding = bindingByCiloId.get(cilo.id);
                  return (
                    <li key={cilo.id ?? `cilo-${index}`} className="rounded-lg border p-4">
                      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                        {cilo.label}
                      </p>
                      <p className="text-foreground mt-2 text-sm">{cilo.description}</p>
                      {binding && (
                        <div className="bg-muted mt-3 rounded-md p-3">
                          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                            Bound Likert Question
                          </p>
                          <p className="text-foreground mt-1 text-sm">
                            {binding.questionPromptSnapshot}
                          </p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
