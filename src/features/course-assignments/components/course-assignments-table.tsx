"use client";

import { CourseScope } from "@prisma/client";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight, MoreHorizontal, Trash2, Power, Pencil, AlertTriangle, Plus } from "lucide-react";
import { showToast } from "@/components/ui/toast";
import {
  deactivateCourseAssignmentAction,
  activateCourseAssignmentAction,
  deleteCourseAssignmentAction,
} from "@/lib/actions/course-assignment-actions";
import { EditCourseAssignmentDialog } from "./edit-course-assignment-dialog";
import type { CourseAssignmentItem, AssignableCourse } from "@/features/course-assignments/types";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/lib/constants/page-sizes";
import { getYearLevelDisplay, getSectionLabel } from "@/lib/constants/academic";

interface Program {
  id: string;
  code: string;
  name: string;
}

type CourseAssignmentsTableMode = "program-head" | "secretary";

interface CourseAssignmentsTableProps {
  assignments: CourseAssignmentItem[];
  total: number;
  page: number;
  pageSize?: number;
  loading?: boolean;
  mode?: CourseAssignmentsTableMode;
  availableCourses?: AssignableCourse[];
  availablePrograms?: Program[];
  onPageChange: (page: number) => void;
  onAssignmentUpdated?: () => void;
  onAssignFaculty?: () => void;
}

export function CourseAssignmentsTable({
  assignments,
  total,
  page,
  pageSize = DEFAULT_TABLE_PAGE_SIZE,
  loading = false,
  mode = "program-head",
  availableCourses = [],
  availablePrograms = [],
  onPageChange,
  onAssignmentUpdated,
  onAssignFaculty,
}: CourseAssignmentsTableProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "deactivate" | "delete" | null;
    assignment: CourseAssignmentItem | null;
  }>({ open: false, type: null, assignment: null });
  const [editAssignment, setEditAssignment] = useState<CourseAssignmentItem | null>(null);

  const totalPages = Math.ceil(total / pageSize);

  const handleActivate = async (assignmentId: string) => {
    setProcessingId(assignmentId);
    const result = await activateCourseAssignmentAction({ assignmentId });
    setProcessingId(null);

    if (result.success) {
      showToast("Assignment activated successfully.", "success");
      onAssignmentUpdated?.();
    } else {
      showToast(result.error || "Failed to activate assignment.", "error");
    }
  };

  const handleDeactivate = async (assignmentId: string) => {
    setProcessingId(assignmentId);
    const result = await deactivateCourseAssignmentAction({ assignmentId });
    setProcessingId(null);

    if (result.success) {
      showToast("Assignment deactivated successfully.", "success");
      onAssignmentUpdated?.();
    } else {
      showToast(result.error || "Failed to deactivate assignment.", "error");
    }
  };

  const handleDelete = async (assignmentId: string) => {
    setProcessingId(assignmentId);
    const result = await deleteCourseAssignmentAction({ assignmentId });
    setProcessingId(null);

    if (result.success) {
      showToast("Assignment deleted permanently.", "success");
      onAssignmentUpdated?.();
    } else {
      showToast(result.error || "Failed to delete assignment.", "error");
    }
  };

  const openConfirmDialog = (type: "deactivate" | "delete", assignment: CourseAssignmentItem) => {
    setConfirmDialog({ open: true, type, assignment });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, type: null, assignment: null });
  };

  const confirmAction = () => {
    if (!confirmDialog.assignment || !confirmDialog.type) return;

    const assignmentId = confirmDialog.assignment.id;

    if (confirmDialog.type === "deactivate") {
      handleDeactivate(assignmentId);
    } else {
      handleDelete(assignmentId);
    }

    closeConfirmDialog();
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-12 space-y-4" data-testid="empty-state">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <AlertTriangle className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-medium">No course assignments found</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {mode === "secretary"
              ? "Assign faculty to a course across any program to get started."
              : "Assign faculty to a Program-specific Course to get started."}
          </p>
        </div>
        <div className="flex items-center justify-center gap-2">
          {onAssignFaculty && (
            <Button onClick={onAssignFaculty}>
              <Plus className="mr-2 h-4 w-4" />
              Assign Faculty
            </Button>
          )}
        </div>
      </div>
    );
  }

  const dialogTitle = confirmDialog.type === "deactivate" ? "Deactivate Assignment?" : "Delete Assignment?";
  const dialogDescription = confirmDialog.type === "deactivate"
    ? "This will deactivate the assignment. You can reactivate it later if needed."
    : "This will permanently delete the assignment. This action cannot be undone.";
  const confirmButtonText = confirmDialog.type === "deactivate" ? "Deactivate" : "Delete";
  const confirmButtonVariant = confirmDialog.type === "deactivate" ? "default" : "destructive";
  const isConfirmDialogProcessing = processingId === confirmDialog.assignment?.id;

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Faculty</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Year Level</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Term</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((assignment) => {
              const isGeneralEducation = assignment.courseScope === CourseScope.GENERAL_EDUCATION;
              const isReadOnly = isGeneralEducation && mode === "program-head";

              return (
                <TableRow key={assignment.id} data-readonly={isReadOnly || undefined}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{assignment.courseCode}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">{assignment.courseTitle}</div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={isGeneralEducation ? "secondary" : "outline"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {isGeneralEducation ? "GE" : "Program-specific"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>{assignment.facultyName}</div>
                    <div className="text-sm text-muted-foreground">{assignment.facultyEmail}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{assignment.programCode}</Badge>
                  </TableCell>
                  <TableCell>{getYearLevelDisplay(assignment.yearLevel)}</TableCell>
                  <TableCell>{getSectionLabel(assignment.section)}</TableCell>
                  <TableCell>{assignment.termLabel}</TableCell>
                  <TableCell>
                    <Badge variant={assignment.isActive ? "default" : "outline"}>
                      {assignment.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {isReadOnly ? (
                      <span className="text-xs text-muted-foreground">Managed by Secretary/Dean</span>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              aria-label={`Open actions for ${assignment.courseCode}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          {mode === "secretary" && (
                            <DropdownMenuItem
                              onClick={() => setEditAssignment(assignment)}
                              disabled={processingId === assignment.id}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {assignment.isActive ? (
                            <DropdownMenuItem
                              onClick={() => openConfirmDialog("deactivate", assignment)}
                              disabled={processingId === assignment.id}
                            >
                              <Power className="mr-2 h-4 w-4 text-amber-600" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleActivate(assignment.id)}
                              disabled={processingId === assignment.id}
                            >
                              <Power className="mr-2 h-4 w-4 text-emerald-600" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => openConfirmDialog("delete", assignment)}
                            disabled={processingId === assignment.id}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={closeConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirmDialog.type === "delete" && <AlertTriangle className="h-5 w-5 text-red-500" />}
              {dialogTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>{dialogDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          {confirmDialog.assignment && (
            <div className="bg-muted rounded-md p-3 text-sm space-y-1">
              <p><strong>Course:</strong> {confirmDialog.assignment.courseCode} - {confirmDialog.assignment.courseTitle}</p>
              <p><strong>Faculty:</strong> {confirmDialog.assignment.facultyName}</p>
              <p><strong>Term:</strong> {confirmDialog.assignment.termLabel}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isConfirmDialogProcessing}>Cancel</AlertDialogCancel>
            <Button
              variant={confirmButtonVariant}
              onClick={confirmAction}
              disabled={isConfirmDialogProcessing}
            >
              {isConfirmDialogProcessing ? `${confirmButtonText}...` : confirmButtonText}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {mode === "secretary" && (
        <EditCourseAssignmentDialog
          open={editAssignment !== null}
          onOpenChange={(open) => {
            if (!open) setEditAssignment(null);
          }}
          assignment={editAssignment}
          availableCourses={availableCourses}
          availablePrograms={availablePrograms}
          onSuccess={() => {
            setEditAssignment(null);
            onAssignmentUpdated?.();
          }}
        />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-label="Previous page"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              aria-label="Next page"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
