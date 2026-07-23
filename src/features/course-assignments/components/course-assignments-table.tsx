"use client";

import { CourseScope } from "@prisma/client";
import Link from "next/link";
import { useRef, useState } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  Power,
  Pencil,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { showToast } from "@/components/ui/toast";
import {
  deactivateCourseAssignmentAction,
  activateCourseAssignmentAction,
  deleteCourseAssignmentAction,
  preflightCourseAssignmentDeletionAction,
} from "@/lib/actions/course-assignment-actions";
import { EditCourseAssignmentDialog } from "./edit-course-assignment-dialog";
import type {
  CourseAssignmentDeletionPreflight,
  CourseAssignmentItem,
  AssignableCourse,
} from "@/features/course-assignments/types";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/lib/constants/page-sizes";
import { getYearLevelDisplay, getSectionLabel } from "@/lib/constants/academic";

interface Program {
  id: string;
  code: string;
  name: string;
}

type CourseAssignmentsTableMode = "program-head" | "all-program";

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
  const [deletionPreflight, setDeletionPreflight] =
    useState<CourseAssignmentDeletionPreflight | null>(null);
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [confirmationLabel, setConfirmationLabel] = useState("");
  const deletionRequest = useRef(0);

  const totalPages = Math.ceil(total / pageSize);

  const handleActivate = async (assignmentId: string) => {
    setProcessingId(assignmentId);
    const result = await activateCourseAssignmentAction({ assignmentId });
    setProcessingId(null);

    if (result.success) {
      showToast("Assignment activated successfully.", "success");
      onAssignmentUpdated?.();
    } else {
      const supportSuffix =
        "referenceId" in result && result.referenceId
          ? ` Support reference: ${result.referenceId}.`
          : "";
      showToast(`${result.error || "Failed to activate assignment."}${supportSuffix}`, "error");
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
      const supportSuffix =
        "referenceId" in result && result.referenceId
          ? ` Support reference: ${result.referenceId}.`
          : "";
      showToast(`${result.error || "Failed to deactivate assignment."}${supportSuffix}`, "error");
    }
  };

  const handleDelete = async (
    assignmentId: string,
    preflight: CourseAssignmentDeletionPreflight
  ) => {
    setProcessingId(assignmentId);
    const result = await deleteCourseAssignmentAction({
      assignmentId,
      confirmationLabel,
      revision: preflight.revision,
      membershipCount: preflight.membershipCount,
      activeMembershipCount: preflight.activeMembershipCount,
      removedMembershipCount: preflight.removedMembershipCount,
    });
    setProcessingId(null);

    if (result.success) {
      showToast("Assignment deleted permanently.", "success");
      closeConfirmDialog();
      onAssignmentUpdated?.();
    } else {
      const supportSuffix =
        "referenceId" in result && result.referenceId
          ? ` Support reference: ${result.referenceId}.`
          : "";
      setDeletionError(`${result.error || "Failed to delete assignment."}${supportSuffix}`);
    }
  };

  const openConfirmDialog = (type: "deactivate" | "delete", assignment: CourseAssignmentItem) => {
    setConfirmDialog({ open: true, type, assignment });
  };

  const closeConfirmDialog = () => {
    deletionRequest.current += 1;
    setConfirmDialog({ open: false, type: null, assignment: null });
    setDeletionPreflight(null);
    setDeletionError(null);
    setConfirmationLabel("");
  };

  const openDeleteDialog = async (assignment: CourseAssignmentItem) => {
    const request = ++deletionRequest.current;
    setConfirmDialog({ open: true, type: "delete", assignment });
    setDeletionPreflight(null);
    setDeletionError(null);
    setConfirmationLabel("");
    const result = await preflightCourseAssignmentDeletionAction(assignment.id);
    if (request !== deletionRequest.current) return;
    if (result.success) setDeletionPreflight(result.data);
    else {
      const supportSuffix =
        "referenceId" in result && result.referenceId
          ? ` Support reference: ${result.referenceId}.`
          : "";
      setDeletionError(`${result.error}${supportSuffix}`);
    }
  };

  const confirmAction = () => {
    if (!confirmDialog.assignment || !confirmDialog.type) return;

    const assignmentId = confirmDialog.assignment.id;

    if (confirmDialog.type === "deactivate") {
      handleDeactivate(assignmentId);
    } else if (deletionPreflight && confirmationLabel === deletionPreflight.label) {
      handleDelete(assignmentId, deletionPreflight);
    }

    if (confirmDialog.type === "deactivate") closeConfirmDialog();
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
      <div className="space-y-4 py-12 text-center" data-testid="empty-state">
        <div className="bg-muted mx-auto flex h-12 w-12 items-center justify-center rounded-full">
          <AlertTriangle className="text-muted-foreground h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-medium">No course assignments found</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {mode === "all-program"
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

  const dialogTitle =
    confirmDialog.type === "deactivate" ? "Deactivate Assignment?" : "Delete Assignment?";
  const dialogDescription =
    confirmDialog.type === "deactivate"
      ? "This will deactivate the assignment. You can reactivate it later if needed."
      : "This permanently deletes the assignment and its roster history. This action cannot be undone.";
  const confirmButtonText =
    confirmDialog.type === "deactivate" ? "Deactivate" : "Delete permanently";
  const confirmButtonVariant = confirmDialog.type === "deactivate" ? "default" : "destructive";
  const isConfirmDialogProcessing = processingId === confirmDialog.assignment?.id;

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Roster</TableHead>
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
                    <Link
                      href={`/course-rosters/${assignment.id}`}
                      className="text-primary focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:outline-none"
                    >
                      Open roster
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{assignment.courseCode}</span>
                    </div>
                    <div className="text-muted-foreground text-sm">{assignment.courseTitle}</div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={isGeneralEducation ? "secondary" : "outline"}
                      className="px-1.5 py-0 text-[10px]"
                    >
                      {isGeneralEducation ? "GE" : "Program-specific"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>{assignment.facultyName}</div>
                    <div className="text-muted-foreground text-sm">{assignment.facultyEmail}</div>
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
                      <span className="text-muted-foreground text-xs">
                        Managed by Secretary/Dean
                      </span>
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
                          {mode === "all-program" && (
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
                            onClick={() => void openDeleteDialog(assignment)}
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
              {confirmDialog.type === "delete" && (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              {dialogTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>{dialogDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          {confirmDialog.assignment && (
            <div className="bg-muted space-y-1 rounded-md p-3 text-sm">
              <p>
                <strong>Course:</strong> {confirmDialog.assignment.courseCode} -{" "}
                {confirmDialog.assignment.courseTitle}
              </p>
              <p>
                <strong>Faculty:</strong> {confirmDialog.assignment.facultyName}
              </p>
              <p>
                <strong>Term:</strong> {confirmDialog.assignment.termLabel}
              </p>
            </div>
          )}
          {confirmDialog.type === "delete" && (
            <div className="flex flex-col gap-3">
              {deletionError && (
                <Alert variant="destructive">
                  <AlertDescription>{deletionError}</AlertDescription>
                </Alert>
              )}
              {deletionPreflight ? (
                <>
                  <p className="text-sm">
                    This removes {deletionPreflight.activeMembershipCount} current roster member
                    {deletionPreflight.activeMembershipCount === 1 ? "" : "s"},{" "}
                    {deletionPreflight.removedMembershipCount} removed history record
                    {deletionPreflight.removedMembershipCount === 1 ? "" : "s"}, and the
                    roster&apos;s membership history, including membership creator, updater, and
                    removal audit history. Student accounts and term placements are not deleted.
                  </p>
                  {deletionPreflight.courseBoundEvaluationCount > 0 && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        A Course-bound evaluation exists. Deactivate this assignment instead.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="assignment-delete-confirmation">
                      Type <span className="font-semibold">{deletionPreflight.label}</span> to
                      confirm.
                    </Label>
                    <Input
                      id="assignment-delete-confirmation"
                      value={confirmationLabel}
                      onChange={(event) => setConfirmationLabel(event.target.value)}
                      autoComplete="off"
                    />
                  </div>
                </>
              ) : !deletionError ? (
                <p className="text-muted-foreground text-sm">
                  Checking the current assignment state...
                </p>
              ) : null}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isConfirmDialogProcessing}>Cancel</AlertDialogCancel>
            <Button
              variant={confirmButtonVariant}
              onClick={confirmAction}
              disabled={
                isConfirmDialogProcessing ||
                (confirmDialog.type === "delete" &&
                  (!deletionPreflight ||
                    deletionPreflight.courseBoundEvaluationCount > 0 ||
                    confirmationLabel !== deletionPreflight.label))
              }
            >
              {isConfirmDialogProcessing ? `${confirmButtonText}...` : confirmButtonText}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {mode === "all-program" && (
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
          <div className="text-muted-foreground text-sm">
            Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total}{" "}
            results
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
