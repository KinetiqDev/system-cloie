"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { ChevronDown, ChevronRight, Eye, MoreVertical, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { showToast } from "@/components/ui/toast";
import type { FacultyPublishedEvaluationItem } from "../types";
import { getYearLevelDisplay } from "@/lib/constants/year-levels";
import { YearLevel } from "@prisma/client";
import { EvaluationDetailDialog } from "./evaluation-detail-dialog";
import { CloseEvaluationDialog } from "./close-evaluation-dialog";
import {
  getFacultyEvaluationDetailAction,
  closeFacultyEvaluationAction,
} from "@/lib/actions/faculty-evaluation-actions";
import { lateIncludeCourseBoundEvaluationAction } from "@/lib/actions/course-bound-evaluation-actions";
import type { FacultyEvaluationDetail } from "../types";

interface FacultyPublishedEvaluationsTableProps {
  evaluations: FacultyPublishedEvaluationItem[];
}

type StatusFilter = "ALL" | "ACTIVE" | "SCHEDULED" | "CLOSED";

function formatDate(date: Date | string | null): string {
  if (!date) return "--";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}


function getStatusColor(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-800";
    case "SCHEDULED":
      return "bg-amber-100 text-amber-800";
    case "CLOSED":
      return "bg-gray-100 text-gray-600";
    case "ARCHIVED":
      return "bg-gray-100 text-gray-400";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function getScopeLabel(scope: string): string {
  return scope
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function FacultyPublishedEvaluationsTable({
  evaluations,
}: FacultyPublishedEvaluationsTableProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedDetail, setSelectedDetail] = useState<FacultyEvaluationDetail | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [evaluationToClose, setEvaluationToClose] = useState<FacultyPublishedEvaluationItem | null>(
    null
  );
  const [isPending, startTransition] = useTransition();
  const [localEvaluations, setLocalEvaluations] = useState(evaluations);

  const filteredEvaluations = localEvaluations.filter((evalItem) => {
    if (statusFilter === "ALL") return evalItem.status !== "ARCHIVED";
    return evalItem.status === statusFilter;
  });

  function toggleRow(evaluationId: string) {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(evaluationId)) {
        newSet.delete(evaluationId);
      } else {
        newSet.add(evaluationId);
      }
      return newSet;
    });
  }

  async function handleView(evaluationId: string) {
    const result = await getFacultyEvaluationDetailAction(evaluationId);
    if (!result.success) {
      showToast(result.error, "error");
      return;
    }
    setSelectedDetail(result.data);
    setDetailDialogOpen(true);
  }

  function handleCloseClick(evalItem: FacultyPublishedEvaluationItem) {
    setEvaluationToClose(evalItem);
    setCloseDialogOpen(true);
  }

  function handleConfirmClose() {
    if (!evaluationToClose) return;

    startTransition(async () => {
      const result = await closeFacultyEvaluationAction(evaluationToClose.evaluationId);

      if (!result.success) {
        showToast(result.error, "error");
        return;
      }

      // Update local state to reflect the closed status
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

  if (localEvaluations.length === 0) {
    return (
      <div className="border-muted rounded-xl border-2 border-dashed py-16 text-center">
        <p className="text-muted-foreground text-sm">
          No published evaluations yet. Publish an evaluation from a template to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">Filter by status:</span>
        <div className="flex gap-1">
          {(["ALL", "ACTIVE", "SCHEDULED", "CLOSED"] as StatusFilter[]).map((filter) => (
            <Button
              key={filter}
              variant={statusFilter === filter ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(filter)}
            >
              {filter === "ALL" ? "All" : filter.charAt(0) + filter.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Deployment Name</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Academic Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Responses</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvaluations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground py-8 text-center text-sm">
                  No evaluations match the selected filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredEvaluations.map((evalItem) => {
                const isExpanded = expandedRows.has(evalItem.evaluationId);
                const canClose = evalItem.status === "ACTIVE" || evalItem.status === "SCHEDULED";

                return (
                  <React.Fragment key={evalItem.evaluationId}>
                    {/* Main Row */}
                    <TableRow
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleRow(evalItem.evaluationId)}
                    >
                      <TableCell className="p-2">
                        <Button variant="ghost" size="sm" className="size-8 p-0">
                          {isExpanded ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{evalItem.deploymentName}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{evalItem.courseCode}</div>
                          <div className="text-muted-foreground max-w-[200px] truncate">
                            {evalItem.courseTitle}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {evalItem.termInstanceLabel}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(evalItem.status)}>
                          {evalItem.status.charAt(0) + evalItem.status.slice(1).toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="font-medium">{evalItem.responseCount}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          / {evalItem.totalAssignments}
                        </span>
                        <div className="bg-muted mt-1 h-1.5 w-16 rounded-full">
                          <div
                            className="bg-primary h-1.5 rounded-full"
                            style={{
                              width:
                                evalItem.totalAssignments > 0
                                  ? `${(evalItem.responseCount / evalItem.totalAssignments) * 100}%`
                                  : "0%",
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="p-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            onClick={(e) => e.stopPropagation()}
                            className="hover:bg-accent hover:text-accent-foreground focus:ring-ring inline-flex size-8 items-center justify-center rounded-md focus:ring-2 focus:ring-offset-2 focus:outline-none"
                          >
                            <MoreVertical className="size-4" />
                            <span className="sr-only">Actions</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleView(evalItem.evaluationId);
                              }}
                            >
                              <Eye className="mr-2 size-4" />
                              View Details
                            </DropdownMenuItem>
                            {canClose && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCloseClick(evalItem);
                                  }}
                                >
                                  <XCircle className="mr-2 size-4" />
                                  Close Evaluation
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Row Details */}
                    {isExpanded && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={7} className="p-4">
                          <div className="grid gap-4 md:grid-cols-3">
                            {/* Course Snapshot */}
                            <div className="space-y-2">
                              <h4 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                                Course Details
                              </h4>
                              <div className="space-y-1 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Scope: </span>
                                  <span className="capitalize">
                                    {getScopeLabel(evalItem.courseScope)}
                                  </span>
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
                                  <span className="text-muted-foreground text-sm">
                                    No specific targets
                                  </span>
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
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
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
