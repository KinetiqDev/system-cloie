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
import { Spinner } from "@/components/ui/spinner";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, Power, Pencil, AlertTriangle, FileX2, Plus } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
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
import { useMediaQuery } from "@/hooks/use-media-query";
import { buildProgramHeadCourseRosterPath } from "@/lib/constants/program-head-routes";

interface Program {
  id: string;
  code: string;
  name: string;
}

type CourseAssignmentsTableMode = "program-head" | "all-program" | "general-education";

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
  selectedProgramId?: string;
  /** False replaces row mutation menus with a read-only marker. */
  canManageAssignments?: boolean;
}

interface CourseAssignmentsRowProps {
  assignment: CourseAssignmentItem;
  mode: CourseAssignmentsTableMode;
  canManageAssignments: boolean;
  selectedProgramId?: string;
  processingId: string | null;
  onEdit: (assignment: CourseAssignmentItem) => void;
  onOpenConfirm: (type: "deactivate" | "delete", assignment: CourseAssignmentItem) => void;
  onActivate: (assignmentId: string) => void;
}

function RosterCell({
  assignment,
  mode,
  selectedProgramId,
}: {
  assignment: CourseAssignmentItem;
  mode: CourseAssignmentsTableMode;
  selectedProgramId?: string;
}) {
  const isCoordinator = mode === "general-education";
  if (isCoordinator) {
    return <span className="text-muted-foreground px-2 text-xs">Roster managed by Program</span>;
  }
  if (mode === "all-program" || (mode === "program-head" && selectedProgramId)) {
    return (
      <Link
        href={
          mode === "all-program"
            ? `/course-rosters/${assignment.id}`
            : buildProgramHeadCourseRosterPath(selectedProgramId!, assignment.id)
        }
        className="text-link focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:outline-none"
      >
        Open roster
      </Link>
    );
  }
  return <span className="text-muted-foreground px-2 text-sm">Roster available in next phase</span>;
}

function AssignmentActions({
  assignment,
  mode,
  canManageAssignments,
  processingId,
  onEdit,
  onOpenConfirm,
  onActivate,
}: Omit<CourseAssignmentsRowProps, "selectedProgramId">) {
  const isGeneralEducation = assignment.courseScope === CourseScope.GENERAL_EDUCATION;
  const readOnlyReason = !canManageAssignments
    ? "View only"
    : (isGeneralEducation && mode === "program-head") ||
        (mode === "general-education" && !isGeneralEducation)
      ? "Read only"
      : null;
  const busy = processingId === assignment.id;

  if (readOnlyReason) {
    return <span className="text-muted-foreground text-xs">{readOnlyReason}</span>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Open actions for ${assignment.courseCode}`}
          >
            <MoreHorizontal />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          {(mode === "all-program" || mode === "general-education" || !isGeneralEducation) && (
            <DropdownMenuItem onClick={() => onEdit(assignment)} disabled={busy}>
              <Pencil />
              Edit
            </DropdownMenuItem>
          )}
          {assignment.isActive ? (
            <DropdownMenuItem
              onClick={() => onOpenConfirm("deactivate", assignment)}
              disabled={busy}
            >
              <Power className="text-warning" />
              Deactivate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => onActivate(assignment.id)} disabled={busy}>
              <Power className="text-success" />
              Activate
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => onOpenConfirm("delete", assignment)}
            disabled={busy}
            className="text-destructive"
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CourseAssignmentsRow({
  assignment,
  mode,
  canManageAssignments,
  selectedProgramId,
  processingId,
  onEdit,
  onOpenConfirm,
  onActivate,
}: CourseAssignmentsRowProps) {
  const isGeneralEducation = assignment.courseScope === CourseScope.GENERAL_EDUCATION;
  const isCoordinator = mode === "general-education";
  const isReadOnly = isGeneralEducation && mode === "program-head";
  const readOnlyReason = !canManageAssignments
    ? "View only"
    : isReadOnly
      ? "Managed by General Education Coordinator"
      : isCoordinator && !isGeneralEducation
        ? "Program-specific"
        : null;
  const scopeLabel = isGeneralEducation ? "GE" : "Program-specific";

  return (
    <TableRow data-readonly={readOnlyReason !== null || undefined}>
      <TableCell>
        <RosterCell assignment={assignment} mode={mode} selectedProgramId={selectedProgramId} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-medium">{assignment.courseCode}</span>
        </div>
        <div className="text-muted-foreground text-sm">{assignment.courseTitle}</div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <Badge variant={isGeneralEducation ? "secondary" : "outline"}>{scopeLabel}</Badge>
          {isGeneralEducation && mode === "program-head" && (
            <span className="text-muted-foreground text-xs">
              Managed by General Education Coordinator
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div>{assignment.facultyName}</div>
        <div className="text-muted-foreground text-sm">{assignment.facultyEmail}</div>
      </TableCell>
      {mode !== "program-head" && (
        <TableCell>
          <Badge variant="outline">{assignment.programCode}</Badge>
        </TableCell>
      )}
      <TableCell>
        <span className="whitespace-nowrap">
          {getYearLevelDisplay(assignment.yearLevel)} · {getSectionLabel(assignment.section)}
        </span>
      </TableCell>
      {mode !== "program-head" && <TableCell>{assignment.termLabel}</TableCell>}
      <TableCell>
        <Badge variant={assignment.isActive ? "success" : "outline"}>
          {assignment.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
        <AssignmentActions
          assignment={assignment}
          mode={mode}
          canManageAssignments={canManageAssignments}
          processingId={processingId}
          onEdit={onEdit}
          onOpenConfirm={onOpenConfirm}
          onActivate={onActivate}
        />
      </TableCell>
    </TableRow>
  );
}

export function CourseAssignmentsTable({
  assignments,
  total,
  page,
  mode = "program-head",
  pageSize = DEFAULT_TABLE_PAGE_SIZE,
  loading = false,
  availableCourses = [],
  availablePrograms = [],
  onPageChange,
  onAssignmentUpdated,
  onAssignFaculty,
  selectedProgramId,
  canManageAssignments = true,
}: CourseAssignmentsTableProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "deactivate" | "delete" | null;
    assignment: CourseAssignmentItem | null;
  }>({ open: false, type: null, assignment: null });
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [editAssignment, setEditAssignment] = useState<CourseAssignmentItem | null>(null);
  const [deletionPreflight, setDeletionPreflight] =
    useState<CourseAssignmentDeletionPreflight | null>(null);
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [confirmationLabel, setConfirmationLabel] = useState("");
  const deletionRequest = useRef(0);

  const totalPages = Math.ceil(total / pageSize);

  const handleActivate = async (assignmentId: string) => {
    setProcessingId(assignmentId);
    const result = await activateCourseAssignmentAction({
      assignmentId,
      programId: selectedProgramId,
    });
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
    const result = await deactivateCourseAssignmentAction({
      assignmentId,
      programId: selectedProgramId,
    });
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
      programId: selectedProgramId,
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
    const result = await preflightCourseAssignmentDeletionAction({
      assignmentId: assignment.id,
      programId: selectedProgramId,
    });
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
      <div className="space-y-2" aria-busy="true">
        <div className="flex items-center gap-2 py-1">
          <Spinner size="sm" label="Loading assignments" />
          <span className="text-muted-foreground text-sm">Loading assignments...</span>
        </div>
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
      <Empty className="py-12" data-testid="empty-state">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileX2 />
          </EmptyMedia>
          <EmptyTitle>No course assignments found</EmptyTitle>
          <EmptyDescription>
            {mode === "all-program"
              ? "Assign faculty to a course across any program to get started."
              : mode === "general-education"
                ? "Assign faculty to a General Education Course to get started."
                : "Assign faculty to a Program-specific Course to get started."}
          </EmptyDescription>
        </EmptyHeader>
        {onAssignFaculty && (
          <Button onClick={onAssignFaculty}>
            <Plus className="mr-2 h-4 w-4" />
            Assign Faculty
          </Button>
        )}
      </Empty>
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
    <div className="flex flex-col gap-4">
      {!isDesktop ? (
        <div className="grid gap-3">
          {assignments.map((assignment) => {
            const isGeneralEducation = assignment.courseScope === CourseScope.GENERAL_EDUCATION;
            return (
              <Card key={assignment.id} size="sm" data-testid={`assignment-card-${assignment.id}`}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    <span>{assignment.courseCode}</span>
                    <Badge variant={isGeneralEducation ? "secondary" : "outline"}>
                      {isGeneralEducation ? "GE" : "Program-specific"}
                    </Badge>
                    <Badge variant={assignment.isActive ? "success" : "outline"}>
                      {assignment.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{assignment.courseTitle}</CardDescription>
                  <CardAction>
                    <AssignmentActions
                      assignment={assignment}
                      mode={mode}
                      canManageAssignments={canManageAssignments}
                      processingId={processingId}
                      onEdit={setEditAssignment}
                      onOpenConfirm={(type, target) =>
                        type === "delete"
                          ? void openDeleteDialog(target)
                          : openConfirmDialog(type, target)
                      }
                      onActivate={handleActivate}
                    />
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div>
                    <p className="font-medium">{assignment.facultyName}</p>
                    <p className="text-muted-foreground text-sm break-all">
                      {assignment.facultyEmail}
                    </p>
                  </div>
                  <p className="text-muted-foreground">
                    {getYearLevelDisplay(assignment.yearLevel)} ·{" "}
                    {getSectionLabel(assignment.section)}
                  </p>
                  <p className="text-muted-foreground">
                    {assignment.rosterMembershipCount ?? 0} roster{" "}
                    {(assignment.rosterMembershipCount ?? 0) === 1 ? "member" : "members"}
                  </p>
                  {isGeneralEducation && mode === "program-head" && (
                    <p className="text-muted-foreground text-xs">
                      Managed by General Education Coordinator
                    </p>
                  )}
                  <RosterCell
                    assignment={assignment}
                    mode={mode}
                    selectedProgramId={selectedProgramId}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roster</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Faculty</TableHead>
                {mode !== "program-head" && <TableHead>Program</TableHead>}
                <TableHead>Class</TableHead>
                {mode !== "program-head" && <TableHead>Term</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <CourseAssignmentsRow
                  key={assignment.id}
                  assignment={assignment}
                  mode={mode}
                  canManageAssignments={canManageAssignments}
                  selectedProgramId={selectedProgramId}
                  processingId={processingId}
                  onEdit={setEditAssignment}
                  onOpenConfirm={(type, target) =>
                    type === "delete"
                      ? void openDeleteDialog(target)
                      : openConfirmDialog(type, target)
                  }
                  onActivate={handleActivate}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={closeConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirmDialog.type === "delete" && (
                <AlertTriangle className="text-destructive h-5 w-5" />
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
                  <Field>
                    <FieldLabel htmlFor="assignment-delete-confirmation">
                      Type <span className="font-semibold">{deletionPreflight.label}</span> to
                      confirm.
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="assignment-delete-confirmation"
                        value={confirmationLabel}
                        onChange={(event) => setConfirmationLabel(event.target.value)}
                        autoComplete="off"
                      />
                    </FieldContent>
                  </Field>
                </>
              ) : !deletionError ? (
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Spinner size="sm" label="Checking the current assignment state" />
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
              loading={isConfirmDialogProcessing}
              disabled={
                confirmDialog.type === "delete" &&
                (!deletionPreflight ||
                  deletionPreflight.courseBoundEvaluationCount > 0 ||
                  confirmationLabel !== deletionPreflight.label)
              }
            >
              {confirmButtonText}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editAssignment !== null && (
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
          selectedProgramId={selectedProgramId}
        />
      )}

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-muted-foreground text-sm">
            Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total}{" "}
            results
          </div>
          <Pagination
            currentPage={page + 1}
            totalPages={totalPages}
            onPageChange={(nextPage) => onPageChange(nextPage - 1)}
          />
        </div>
      )}
    </div>
  );
}
