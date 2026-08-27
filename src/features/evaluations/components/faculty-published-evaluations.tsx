"use client";

import { useState, useTransition } from "react";
import { Eye, XCircle } from "lucide-react";
import { YearLevel } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { showToast } from "@/components/ui/toast";
import { getYearLevelDisplay } from "@/lib/constants/year-levels";
import type { ToolsViewMode } from "@/features/instruments/components/tools-view-selector";
import {
  closeFacultyEvaluationAction,
  getFacultyEvaluationDetailAction,
} from "@/lib/actions/faculty-evaluation-actions";
import { lateIncludeCourseBoundEvaluationAction } from "@/lib/actions/course-bound-evaluation-actions";
import { CloseEvaluationDialog } from "./close-evaluation-dialog";
import { EvaluationDetailDialog } from "./evaluation-detail-dialog";
import {
  PublishedDeploymentsCollection,
  type PublishedDeploymentItem,
} from "./published-deployments-collection";
import type { FacultyEvaluationDetail, FacultyPublishedEvaluationItem } from "../types";

type FacultyPublishedEvaluationsProps = {
  evaluations: FacultyPublishedEvaluationItem[];
  view: ToolsViewMode;
};

function formatDate(date: Date | string | null): string {
  if (!date) return "--";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getScopeLabel(scope: string): string {
  return scope
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function FacultyPublishedEvaluations({
  evaluations,
  view,
}: FacultyPublishedEvaluationsProps) {
  const [localEvaluations, setLocalEvaluations] = useState(evaluations);
  const [selectedDetail, setSelectedDetail] = useState<FacultyEvaluationDetail | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [evaluationToClose, setEvaluationToClose] = useState<FacultyPublishedEvaluationItem | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const items: PublishedDeploymentItem[] = localEvaluations.map((evalItem) => ({
    id: evalItem.evaluationId,
    name: evalItem.deploymentName,
    courseLabel: `${evalItem.courseCode} · ${evalItem.courseTitle}`,
    targetLabel: null,
    periodLabel: evalItem.termInstanceLabel,
    status: evalItem.status,
    responseCount: evalItem.responseCount,
    totalCount: evalItem.totalAssignments,
    publishedDate: evalItem.publishedAt,
    canClose: evalItem.status === "ACTIVE" || evalItem.status === "SCHEDULED",
  }));

  async function handleView(evaluationId: string) {
    const result = await getFacultyEvaluationDetailAction(evaluationId);
    if (!result.success) {
      showToast(result.error, "error");
      return;
    }
    setSelectedDetail(result.data);
    setDetailDialogOpen(true);
  }

  function handleRequestClose(evaluationId: string) {
    const target = localEvaluations.find((e) => e.evaluationId === evaluationId);

    if (target) {
      setEvaluationToClose(target);
      setCloseDialogOpen(true);
    }
  }

  function handleConfirmClose() {
    if (!evaluationToClose) return;

    startTransition(async () => {
      const result = await closeFacultyEvaluationAction(evaluationToClose.evaluationId);

      if (!result.success) {
        showToast(result.error, "error");
        return;
      }

      setLocalEvaluations((prev) =>
        prev.map((evalItem) =>
          evalItem.evaluationId === evaluationToClose.evaluationId
            ? { ...evalItem, status: "CLOSED" as const }
            : evalItem
        )
      );

      showToast("Evaluation closed successfully.");
      setCloseDialogOpen(false);
      setEvaluationToClose(null);
    });
  }

  return (
    <div className="space-y-4">
      <PublishedDeploymentsCollection
        view={view}
        items={items}
        label="Published evaluations"
        empty={
          <div className="border-muted rounded-xl border-2 border-dashed py-16 text-center">
            <p className="text-muted-foreground text-sm">
              No published evaluations yet. Publish an evaluation from a template to get started.
            </p>
          </div>
        }
        renderExpanded={(item) => {
          const evalItem = localEvaluations.find((e) => e.evaluationId === item.id);
          if (!evalItem) return null;
          return <FacultyExpandedDetails evalItem={evalItem} />;
        }}
        renderMenuItems={(item) => (
          <>
            <DropdownMenuItem onClick={() => handleView(item.id)}>
              <Eye className="mr-2 size-4" />
              View Details
            </DropdownMenuItem>
            {item.canClose && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => handleRequestClose(item.id)}>
                  <XCircle className="mr-2 size-4" />
                  Close Evaluation
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
        renderCardActions={(item) => (
          <>
            <Button variant="outline" size="sm" onClick={() => handleView(item.id)}>
              <Eye data-icon="inline-start" />
              View Details
            </Button>
            {item.canClose && (
              <Button variant="destructive" size="sm" onClick={() => handleRequestClose(item.id)}>
                <XCircle data-icon="inline-start" />
                Close Evaluation
              </Button>
            )}
          </>
        )}
      />

      <EvaluationDetailDialog
        detail={selectedDetail}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        lateIncludeAction={lateIncludeCourseBoundEvaluationAction}
      />

      <CloseEvaluationDialog
        deploymentName={evaluationToClose?.deploymentName ?? ""}
        open={closeDialogOpen}
        onOpenChange={(open) => {
          setCloseDialogOpen(open);
          if (!open) setEvaluationToClose(null);
        }}
        onConfirm={handleConfirmClose}
        isPending={isPending}
      />
    </div>
  );
}

function FacultyExpandedDetails({ evalItem }: { evalItem: FacultyPublishedEvaluationItem }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Course Details */}
      <div className="space-y-2">
        <h4 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Course Details
        </h4>
        <div className="space-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Scope: </span>
            <span className="capitalize">{getScopeLabel(evalItem.courseScope)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Program: </span>
            {evalItem.programCode} - {evalItem.programName}
          </div>
          {evalItem.majorName && (
            <div>
              <span className="text-muted-foreground">Major: </span>
              {evalItem.majorName}
            </div>
          )}
        </div>
      </div>

      {/* Target Year Levels */}
      <div className="space-y-2">
        <h4 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Target Year Levels
        </h4>
        <div className="flex flex-wrap gap-1">
          {evalItem.targetYearLevels.length === 0 ? (
            <span className="text-muted-foreground text-sm">No specific targets</span>
          ) : (
            evalItem.targetYearLevels.map((level, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {getYearLevelDisplay(level as YearLevel)}
              </Badge>
            ))
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        <h4 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Timeline
        </h4>
        <div className="space-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Published: </span>
            {formatDate(evalItem.publishedAt)}
          </div>
          {evalItem.activationAt && (
            <div>
              <span className="text-muted-foreground">Activation: </span>
              {formatDate(evalItem.activationAt)}
            </div>
          )}
          {evalItem.deadlineAt && (
            <div>
              <span className="text-muted-foreground">Deadline: </span>
              {formatDate(evalItem.deadlineAt)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
