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
import {
  MoreHorizontal,
  Trash2,
  Power,
  Pencil,
  AlertTriangle,
  Plus,
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  ExternalLink,
} from "lucide-react";
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
    return (
      <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground ring-1 ring-border">
        Roster managed by Program
      </span>
    );
  }
  if (mode === "all-program" || (mode === "program-head" && selectedProgramId)) {
    const href =
      mode === "all-program"
        ? `/course-rosters/${assignment.id}`
        : buildProgramHeadCourseRosterPath(selectedProgramId!, assignment.id);
    return (
      <Button
        variant="outline"
        size="sm"
        asChild
        className="h-8 gap-1.5 rounded-full bg-background px-3 text-xs font-medium shadow-xs hover:bg-accent"
      >
        <Link href={href}>
          <Users className="size-3.5" aria-hidden="true" />
          Open roster
          <ExternalLink className="size-3 opacity-60" aria-hidden="true" />
        </Link>
      </Button>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">
      Roster available in program view
    </span>
  );
}

// Menu branches express the role/scope action matrix pinned by assignment workflow tests.
// fallow-ignore-next-line complexity
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
    return <span className="text-muted-foreground text-xs font-medium">{readOnlyReason}</span>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Open actions for ${assignment.courseCode}`}
            className="size-8 rounded-full"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuGroup>
          {(mode === "all-program" || mode === "general-education" || !isGeneralEducation) && (
            <DropdownMenuItem onClick={() => onEdit(assignment)} disabled={busy}>
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
          )}
          {assignment.isActive ? (
            <DropdownMenuItem
              onClick={() => onOpenConfirm("deactivate", assignment)}
              disabled={busy}
            >
              <Power className="size-4 text-warning" />
              Deactivate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => onActivate(assignment.id)} disabled={busy}>
              <Power className="size-4 text-success" />
              Activate
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => onOpenConfirm("delete", assignment)}
            disabled={busy}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Row branches keep the desktop role/scope matrix visible and covered as one table contract.
// fallow-ignore-next-line complexity
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
    <TableRow
      data-readonly={readOnlyReason !== null || undefined}
      className="group hover:bg-muted/40"
    >
      <TableCell className="py-3">
        <div className="flex flex-col gap-1">
          <span className="font-semibold tracking-tight tabular-nums">{assignment.courseCode}</span>
          <span className="text-muted-foreground line-clamp-1 max-w-[18rem] text-xs">
            {assignment.courseTitle}
          </span>
        </div>
      </TableCell>
      <TableCell className="py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/15">
            {(assignment.facultyName ?? "Unknown")
              .split(" ")
              .slice(0, 2)
              .map((part) => part[0] ?? "")
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium leading-none">
              {assignment.facultyName ?? "Unknown faculty"}
            </span>
            <span className="text-muted-foreground truncate text-xs">{assignment.facultyEmail ?? "—"}</span>
          </div>
        </div>
      </TableCell>
      {mode !== "program-head" && (
        <TableCell className="py-3">
          <Badge variant="outline" className="rounded-full bg-background font-medium">
            {assignment.programCode}
          </Badge>
        </TableCell>
      )}
      <TableCell className="py-3">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border bg-background px-2.5 py-1 text-xs font-medium">
          <GraduationCap className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
          {getYearLevelDisplay(assignment.yearLevel)} · {getSectionLabel(assignment.section)}
        </span>
      </TableCell>
      <TableCell className="py-3">
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
          <CalendarDays className="size-3 shrink-0" aria-hidden="true" />
          <span className="max-w-[10rem] truncate tabular-nums">{assignment.termLabel}</span>
        </span>
      </TableCell>
      <TableCell className="py-3">
        <div className="flex flex-col items-start gap-1">
          <Badge
            variant={isGeneralEducation ? "secondary" : "outline"}
            className="rounded-full px-2.5 py-1 text-xs"
          >
            {scopeLabel}
          </Badge>
          {isGeneralEducation && mode === "program-head" && (
            <span className="text-muted-foreground block text-[10px] leading-none">
              Managed by General Education Coordinator
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="py-3">
        <Badge
          variant={assignment.isActive ? "success" : "outline"}
          className="rounded-full px-2.5 py-1 text-xs"
        >
          <span
            className={`mr-1.5 size-1.5 rounded-full ${assignment.isActive ? "bg-success" : "bg-muted-foreground"}`}
            aria-hidden="true"
          />
          {assignment.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell className="py-3">
        <RosterCell assignment={assignment} mode={mode} selectedProgramId={selectedProgramId} />
      </TableCell>
      <TableCell className="py-3">
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

// Desktop and mobile presentations intentionally share mutation state and confirmation workflows.
// fallow-ignore-next-line complexity
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
      <div className="space-y-3" aria-busy="true">
        <div className="flex items-center gap-2 py-1">
          <Spinner size="sm" label="Loading assignments" />
          <span className="text-muted-foreground text-sm">Loading assignments…</span>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <Empty
        className="border bg-card py-10 shadow-xs rounded-xl"
        data-testid="empty-state"
      >
        <EmptyHeader className="items-center">
          <EmptyMedia variant="icon" className="bg-muted ring-1 ring-border">
            <BookOpen className="size-5 text-muted-foreground" />
          </EmptyMedia>
          <EmptyTitle className="text-title-md">
            {mode === "all-program" || mode === "program-head"
              ? "No course assignments found"
              : mode === "general-education"
                ? "No General Education assignments"
                : "No course assignments found"}
          </EmptyTitle>
          <EmptyDescription className="max-w-md text-balance text-sm leading-relaxed">
            {mode === "all-program"
              ? "Assign faculty to a course across any program to get started. Each assignment creates a class and its roster."
              : mode === "general-education"
                ? "Assign faculty to a General Education course to get started. GE assignments are shared college-wide."
                : "Assign faculty to a Program-specific Course to get started. Create a class — year, section, and term — and its roster unlocks evaluations."}
          </EmptyDescription>
        </EmptyHeader>
        {onAssignFaculty && (
          <Button onClick={onAssignFaculty} className="mt-2 min-h-11 shadow-sm">
            <Plus className="size-4" aria-hidden="true" />
            Assign Faculty
          </Button>
        )}
        {!onAssignFaculty && mode === "program-head" && (
          <p className="text-xs text-muted-foreground">Read-only view for this program.</p>
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
            const classLabel = `${getYearLevelDisplay(assignment.yearLevel)} · ${getSectionLabel(assignment.section)}`;
            return (
              <Card
                key={assignment.id}
                size="sm"
                data-testid={`assignment-card-${assignment.id}`}
                className="overflow-hidden border shadow-xs transition-shadow hover:shadow-sm"
              >
                <CardHeader className="gap-3 pb-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-[15px] leading-tight">
                      <span className="font-semibold tracking-tight tabular-nums">
                        {assignment.courseCode}
                      </span>
                      <Badge
                        variant={isGeneralEducation ? "secondary" : "outline"}
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                      >
                        {isGeneralEducation ? "GE" : "Program-specific"}
                      </Badge>
                      <Badge
                        variant={assignment.isActive ? "success" : "outline"}
                        className="rounded-full px-2 py-0.5 text-[10px]"
                      >
                        <span
                          className={`mr-1 size-1 rounded-full ${assignment.isActive ? "bg-success" : "bg-muted-foreground"}`}
                          aria-hidden="true"
                        />
                        {assignment.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-sm leading-snug">
                      {assignment.courseTitle}
                    </CardDescription>
                    <p className="inline-flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                      <CalendarDays className="size-3 shrink-0" aria-hidden="true" />
                      {assignment.termLabel}
                    </p>
                  </div>
                  <CardAction className="self-start">
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
                <CardContent className="flex flex-col gap-3 pt-0">
                  <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3">
                    <div className="col-span-2 flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/15">
                        {(assignment.facultyName ?? "Unknown")
                          .split(" ")
                          .slice(0, 2)
                          .map((p) => p[0] ?? "")
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium leading-none">
                          {assignment.facultyName ?? "Unknown faculty"}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {assignment.facultyEmail ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Class
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                        <GraduationCap className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        {classLabel}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Roster
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium tabular-nums">
                        <Users className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        {assignment.rosterMembershipCount ?? 0} roster{" "}
                        {(assignment.rosterMembershipCount ?? 0) === 1 ? "member" : "members"}
                      </span>
                    </div>
                  </div>
                  {isGeneralEducation && mode === "program-head" && (
                    <p className="rounded-md bg-warning-soft px-2.5 py-1.5 text-xs font-medium text-warning-foreground ring-1 ring-warning/20">
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
        <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold uppercase tracking-widest">
                  Course
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-widest">
                  Faculty
                </TableHead>
                {mode !== "program-head" && (
                  <TableHead className="text-xs font-semibold uppercase tracking-widest">
                    Program
                  </TableHead>
                )}
                <TableHead className="text-xs font-semibold uppercase tracking-widest">
                  Class
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-widest">
                  Term
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-widest">
                  Scope
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-widest">
                  Status
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-widest">
                  Roster
                </TableHead>
                <TableHead className="w-[48px]">
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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5">
          <div className="text-muted-foreground text-sm tabular-nums">
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
