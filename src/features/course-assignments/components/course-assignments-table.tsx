"use client";

import { CourseScope } from "@prisma/client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
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
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { showToast } from "@/components/ui/toast";
import {
  bulkSetCourseAssignmentsActiveAction,
  deactivateCourseAssignmentAction,
  activateCourseAssignmentAction,
  deleteCourseAssignmentAction,
  preflightCourseAssignmentDeletionAction,
} from "@/lib/actions/course-assignment-actions";
import { EditCourseAssignmentDialog } from "./edit-course-assignment-dialog";
import type {
  CourseAssignmentDeletionPreflight,
  CourseAssignmentItem,
  CourseAssignmentSortField,
  AssignableCourse,
} from "@/features/course-assignments/types";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/lib/constants/page-sizes";
import { getYearLevelDisplay, getSectionLabel } from "@/lib/constants/academic";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { buildProgramHeadCourseRosterPath } from "@/lib/constants/program-head-routes";
import { useTableSelection } from "@/hooks/use-table-selection";
import { parseCourseAssignmentSortField } from "../course-assignment-list-state";

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
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
  onEdit: (assignment: CourseAssignmentItem) => void;
  onOpenConfirm: (type: "deactivate" | "delete", assignment: CourseAssignmentItem) => void;
  onActivate: (assignmentId: string) => void;
}

const VIEW_ONLY_LABEL = "View only";
const READ_ONLY_LABEL = "Read only";
const PROGRAM_SPECIFIC_LABEL = "Program-specific";
const COORDINATOR_SCOPE_LABEL = "Managed by General Education Coordinator";

/**
 * One row's display capability for the list UI. Every write re-authorizes
 * against `course_scope` inside the server service; this is a display
 * contract, never an authorization source.
 */
type AssignmentRowCapability = {
  selectable: boolean;
  readOnlyLabel: string | null;
  menuReadOnlyLabel: string | null;
  delegatedToCoordinator: boolean;
};

/**
 * Resolves the row capability from the list mode and the Course scope: the
 * Program Head sees only Program-specific rows and the Coordinator only
 * General Education rows, while a view-only host keeps the whole list
 * read-only.
 */
function assignmentRowCapability(
  mode: CourseAssignmentsTableMode,
  canManageAssignments: boolean,
  courseScope: CourseScope | null | undefined
): AssignmentRowCapability {
  const isGeneralEducation = courseScope === CourseScope.GENERAL_EDUCATION;
  const dispatchedToCoordinator = mode === "program-head" && isGeneralEducation;
  const inRoleScope =
    mode === "program-head"
      ? !isGeneralEducation
      : mode === "general-education"
        ? isGeneralEducation
        : true;
  const selectable = canManageAssignments && inRoleScope;

  if (selectable) {
    return {
      selectable,
      readOnlyLabel: null,
      menuReadOnlyLabel: null,
      delegatedToCoordinator: dispatchedToCoordinator,
    };
  }
  if (!canManageAssignments) {
    return {
      selectable,
      readOnlyLabel: VIEW_ONLY_LABEL,
      menuReadOnlyLabel: VIEW_ONLY_LABEL,
      delegatedToCoordinator: dispatchedToCoordinator,
    };
  }
  return {
    selectable,
    readOnlyLabel: dispatchedToCoordinator ? COORDINATOR_SCOPE_LABEL : PROGRAM_SPECIFIC_LABEL,
    menuReadOnlyLabel: READ_ONLY_LABEL,
    delegatedToCoordinator: dispatchedToCoordinator,
  };
}

/**
 * The roster entry point for one row. Roster navigation is deliberately a
 * separate decision from the row capability: a view-only Secretary keeps the
 * roster-discovery link, while the Coordinator gets a notice instead.
 */
type RosterNavigation = { kind: "link"; href: string } | { kind: "notice"; label: string };

function rosterNavigation(
  mode: CourseAssignmentsTableMode,
  assignmentId: string,
  selectedProgramId?: string
): RosterNavigation {
  if (mode === "general-education") {
    return { kind: "notice", label: "Roster managed by Program" };
  }
  if (mode === "all-program") {
    return { kind: "link", href: `/course-rosters/${assignmentId}` };
  }
  if (selectedProgramId) {
    return {
      kind: "link",
      href: buildProgramHeadCourseRosterPath(selectedProgramId, assignmentId),
    };
  }
  return { kind: "notice", label: "Roster available in program view" };
}

/** Two-letter avatar initials derived from the canonical account name. */
function facultyInitials(name: string | null | undefined): string {
  return (name ?? "Unknown")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Display facts shared by the desktop row and the mobile card. */
type AssignmentRowPresentation = {
  scopeLabel: string;
  scopeBadgeVariant: "secondary" | "outline";
  statusLabel: string;
  statusBadgeVariant: "success" | "outline";
  statusDotClass: string;
  rosterCountLabel: string;
  facultyName: string;
  facultyEmail: string;
  facultyInitials: string;
  classLabel: string;
};

function assignmentRowPresentation(assignment: CourseAssignmentItem): AssignmentRowPresentation {
  const isGeneralEducation = assignment.courseScope === CourseScope.GENERAL_EDUCATION;
  const rosterCount = assignment.rosterMembershipCount ?? 0;
  return {
    scopeLabel: isGeneralEducation ? "GE" : "Program-specific",
    scopeBadgeVariant: isGeneralEducation ? "secondary" : "outline",
    statusLabel: assignment.isActive ? "Active" : "Inactive",
    statusBadgeVariant: assignment.isActive ? "success" : "outline",
    statusDotClass: assignment.isActive ? "bg-success" : "bg-muted-foreground",
    rosterCountLabel: `${rosterCount} roster ${rosterCount === 1 ? "member" : "members"}`,
    facultyName: assignment.facultyName ?? "Unknown faculty",
    facultyEmail: assignment.facultyEmail ?? "—",
    facultyInitials: facultyInitials(assignment.facultyName),
    classLabel: `${getYearLevelDisplay(assignment.yearLevel)} · ${getSectionLabel(assignment.section)}`,
  };
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
  const roster = rosterNavigation(mode, assignment.id, selectedProgramId);
  if (roster.kind === "notice") {
    const noticeClass =
      mode === "general-education"
        ? "bg-muted text-muted-foreground ring-border inline-flex items-center rounded-md px-2.5 py-1.5 text-xs font-medium ring-1"
        : "bg-muted text-muted-foreground inline-flex items-center rounded-md px-2.5 py-1 text-xs";
    return <span className={noticeClass}>{roster.label}</span>;
  }
  return (
    <Link
      href={roster.href}
      aria-label={`Open roster for ${assignment.courseCode}`}
      className={buttonVariants({
        variant: "outline",
        size: "sm",
        className:
          "border-primary-border bg-primary-soft text-selected-fg hover:bg-selected-bg hover:text-selected-fg h-8 gap-1.5 rounded-full px-3 text-xs font-semibold shadow-xs",
      })}
    >
      <Users aria-hidden="true" />
      Open roster
      <ExternalLink className="opacity-70" aria-hidden="true" />
    </Link>
  );
}

function AssignmentActions({
  assignment,
  mode,
  canManageAssignments,
  processingId,
  onEdit,
  onOpenConfirm,
  onActivate,
}: Omit<CourseAssignmentsRowProps, "selectedProgramId" | "selected" | "onSelectedChange">) {
  const capability = assignmentRowCapability(mode, canManageAssignments, assignment.courseScope);
  const busy = processingId === assignment.id;

  if (capability.menuReadOnlyLabel) {
    return (
      <span className="text-muted-foreground text-xs font-medium">
        {capability.menuReadOnlyLabel}
      </span>
    );
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
          {/* Out-of-scope rows returned the read-only marker above. */}
          <DropdownMenuItem onClick={() => onEdit(assignment)} disabled={busy}>
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>
          {assignment.isActive ? (
            <DropdownMenuItem
              onClick={() => onOpenConfirm("deactivate", assignment)}
              disabled={busy}
            >
              <Power className="text-warning size-4" />
              Deactivate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => onActivate(assignment.id)} disabled={busy}>
              <Power className="text-success size-4" />
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

function CourseAssignmentsRow({
  assignment,
  mode,
  canManageAssignments,
  selectedProgramId,
  processingId,
  selected,
  onSelectedChange,
  onEdit,
  onOpenConfirm,
  onActivate,
}: CourseAssignmentsRowProps) {
  const capability = assignmentRowCapability(mode, canManageAssignments, assignment.courseScope);
  const presentation = assignmentRowPresentation(assignment);
  return (
    <TableRow
      data-readonly={capability.readOnlyLabel !== null || undefined}
      data-state={selected ? "selected" : undefined}
      className="group hover:bg-muted/40"
    >
      <TableCell>
        {capability.selectable ? (
          <Checkbox
            aria-label={`Select ${assignment.courseCode}`}
            checked={selected}
            onCheckedChange={(checked) => onSelectedChange(Boolean(checked))}
          />
        ) : null}
      </TableCell>
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
          <span className="bg-primary/10 text-link ring-primary/15 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1">
            {presentation.facultyInitials}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm leading-none font-medium">
              {presentation.facultyName}
            </span>
            <span className="text-muted-foreground truncate text-xs">
              {presentation.facultyEmail}
            </span>
          </div>
        </div>
      </TableCell>
      {mode !== "program-head" && (
        <TableCell className="py-3">
          <Badge variant="outline" className="bg-background rounded-full font-medium">
            {assignment.programCode}
          </Badge>
        </TableCell>
      )}
      <TableCell className="py-3">
        <span className="bg-background inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap">
          <GraduationCap className="text-muted-foreground size-3 shrink-0" aria-hidden="true" />
          {presentation.classLabel}
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
            variant={presentation.scopeBadgeVariant}
            className="rounded-full px-2.5 py-1 text-xs"
          >
            {presentation.scopeLabel}
          </Badge>
          {capability.delegatedToCoordinator && (
            <span className="text-muted-foreground block text-xs leading-snug">
              {COORDINATOR_SCOPE_LABEL}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="py-3">
        <Badge
          variant={presentation.statusBadgeVariant}
          className="rounded-full px-2.5 py-1 text-xs"
        >
          <span
            className={`mr-1.5 size-1.5 rounded-full ${presentation.statusDotClass}`}
            aria-hidden="true"
          />
          {presentation.statusLabel}
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

function SortableColumnHeader({
  field,
  label,
  activeSort,
  activeDir,
  isPending,
  onSort,
}: {
  field: CourseAssignmentSortField;
  label: string;
  activeSort: CourseAssignmentSortField | null;
  activeDir: "asc" | "desc";
  isPending: boolean;
  onSort: (field: CourseAssignmentSortField) => void;
}) {
  const isActive = activeSort === field;
  return (
    <TableHead
      aria-sort={isActive ? (activeDir === "asc" ? "ascending" : "descending") : "none"}
      className="text-xs font-semibold tracking-widest uppercase"
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        aria-label={`Sort by ${label}, currently ${isActive ? activeDir : "unsorted"}`}
        aria-busy={isPending || undefined}
        className="focus-visible:ring-ring inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 font-semibold uppercase focus-visible:ring-3 focus-visible:outline-none"
      >
        {label}
        {isActive ? (
          activeDir === "asc" ? (
            <ArrowUp aria-hidden="true" className="size-3.5 shrink-0" />
          ) : (
            <ArrowDown aria-hidden="true" className="size-3.5 shrink-0" />
          )
        ) : (
          <ArrowUpDown aria-hidden="true" className="size-3.5 shrink-0 opacity-50" />
        )}
      </button>
    </TableHead>
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isSortPending, startSortTransition] = useTransition();
  const activeSort = parseCourseAssignmentSortField(searchParams.get("sort")) ?? null;
  const activeDir = searchParams.get("dir") === "desc" ? "desc" : "asc";

  const handleSort = (field: CourseAssignmentSortField) => {
    const nextDir = activeSort === field ? (activeDir === "asc" ? "desc" : "asc") : "asc";
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", field);
    // Ascending is the canonical default, so an explicit dir=asc would only
    // trigger a canonicalizing redirect. Omit it like the URL state serializer.
    if (nextDir === "asc") params.delete("dir");
    else params.set("dir", nextDir);
    params.delete("page");
    const query = params.toString();
    startSortTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  };

  const totalPages = Math.ceil(total / pageSize);
  const manageableAssignments = useMemo(
    () =>
      assignments.filter(
        (assignment) =>
          assignmentRowCapability(mode, canManageAssignments, assignment.courseScope).selectable
      ),
    [assignments, canManageAssignments, mode]
  );
  const selection = useTableSelection(
    manageableAssignments.map((assignment) => assignment.id),
    `${page}:${mode}:${selectedProgramId ?? ""}`
  );

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
  const handleBulkStatus = async (isActive: boolean) => {
    setProcessingId("bulk");
    const result = await bulkSetCourseAssignmentsActiveAction({
      assignmentIds: [...selection.selectedIds],
      isActive,
      programId: selectedProgramId,
    });
    setProcessingId(null);
    if (result.failed.length > 0) {
      showToast(
        `${result.succeeded.length} updated; ${result.failed.length} could not be updated.`,
        "warning"
      );
    } else {
      showToast(
        `${result.succeeded.length} assignments ${isActive ? "activated" : "deactivated"}.`,
        "success"
      );
    }
    selection.clearSelection();
    onAssignmentUpdated?.();
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
    } else if (deletionPreflight && confirmationLabel.trim() === deletionPreflight.label.trim()) {
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
      <Empty className="bg-card rounded-xl border py-10 shadow-xs" data-testid="empty-state">
        <EmptyHeader className="items-center">
          <EmptyMedia variant="icon" className="bg-muted ring-border ring-1">
            <BookOpen className="text-muted-foreground size-5" />
          </EmptyMedia>
          <EmptyTitle className="text-title-md">
            {mode === "all-program" || mode === "program-head"
              ? "No course assignments found"
              : mode === "general-education"
                ? "No General Education assignments"
                : "No course assignments found"}
          </EmptyTitle>
          <EmptyDescription className="max-w-md text-sm leading-relaxed text-balance">
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
          <p className="text-muted-foreground text-xs">Read-only view for this program.</p>
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
      <BulkActionBar
        selectedCount={selection.selectedCount}
        itemLabel="assignment"
        onClear={selection.clearSelection}
      >
        <Button
          size="sm"
          variant="outline"
          disabled={processingId !== null}
          onClick={() => void handleBulkStatus(true)}
        >
          <Power aria-hidden="true" className="size-4" />
          Activate
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={processingId !== null}
          onClick={() => void handleBulkStatus(false)}
        >
          <Power aria-hidden="true" className="size-4" />
          Deactivate
        </Button>
      </BulkActionBar>

      {!isDesktop ? (
        <div className="grid min-w-0 gap-3">
          {assignments.map((assignment) => {
            const capability = assignmentRowCapability(
              mode,
              canManageAssignments,
              assignment.courseScope
            );
            const presentation = assignmentRowPresentation(assignment);
            return (
              <Card
                key={assignment.id}
                size="sm"
                data-testid={`assignment-card-${assignment.id}`}
                data-state={selection.selectedIds.has(assignment.id) ? "selected" : undefined}
                className="data-[state=selected]:bg-selected-bg min-w-0 overflow-hidden border shadow-xs transition-shadow hover:shadow-sm"
              >
                <CardHeader className="min-w-0 gap-3 pb-3">
                  {capability.selectable && (
                    <Checkbox
                      aria-label={`Select ${assignment.courseCode}`}
                      checked={selection.selectedIds.has(assignment.id)}
                      onCheckedChange={(checked) =>
                        selection.toggleOne(assignment.id, Boolean(checked))
                      }
                    />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-[15px] leading-tight">
                      <span className="font-semibold tracking-tight tabular-nums">
                        {assignment.courseCode}
                      </span>
                      <Badge
                        variant={presentation.scopeBadgeVariant}
                        className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      >
                        {presentation.scopeLabel}
                      </Badge>
                      <Badge
                        variant={presentation.statusBadgeVariant}
                        className="rounded-full px-2 py-0.5 text-xs"
                      >
                        <span
                          className={`mr-1 size-1 rounded-full ${presentation.statusDotClass}`}
                          aria-hidden="true"
                        />
                        {presentation.statusLabel}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-sm leading-snug">
                      {assignment.courseTitle}
                    </CardDescription>
                    <p className="text-muted-foreground flex min-w-0 items-start gap-1.5 text-xs leading-relaxed tabular-nums">
                      <CalendarDays className="mt-0.5 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 break-words">{assignment.termLabel}</span>
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
                <CardContent className="flex min-w-0 flex-col gap-3 pt-0">
                  <div className="bg-muted/30 grid min-w-0 grid-cols-1 gap-3 rounded-lg border p-3 min-[380px]:grid-cols-2">
                    <div className="flex min-w-0 items-center gap-2.5 min-[380px]:col-span-2">
                      <span className="bg-primary text-primary-foreground ring-primary/20 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1">
                        {presentation.facultyInitials}
                      </span>
                      <div className="flex min-w-0 flex-col gap-1">
                        <p className="truncate text-sm leading-none font-medium">
                          {presentation.facultyName}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {presentation.facultyEmail}
                        </p>
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                        Class
                      </span>
                      <span className="inline-flex min-w-0 items-start gap-1.5 text-sm font-medium">
                        <GraduationCap
                          className="text-muted-foreground mt-0.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="break-words">{presentation.classLabel}</span>
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                        Roster
                      </span>
                      <span className="inline-flex min-w-0 items-start gap-1.5 text-sm font-medium tabular-nums">
                        <Users
                          className="text-muted-foreground mt-0.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="break-words">{presentation.rosterCountLabel}</span>
                      </span>
                    </div>
                  </div>
                  {capability.delegatedToCoordinator && (
                    <p className="bg-warning-soft text-warning-foreground ring-warning/20 rounded-md px-2.5 py-2 text-xs font-medium ring-1">
                      {COORDINATOR_SCOPE_LABEL}
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
        <div className="bg-card overflow-x-auto rounded-xl border shadow-xs">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">
                  <Checkbox
                    aria-label="Select all manageable assignments on this page"
                    checked={selection.allVisibleSelected}
                    indeterminate={selection.someVisibleSelected}
                    disabled={manageableAssignments.length === 0}
                    onCheckedChange={(checked) => selection.toggleAllVisible(Boolean(checked))}
                  />
                </TableHead>
                <SortableColumnHeader
                  field="course"
                  label="Course"
                  activeSort={activeSort}
                  activeDir={activeDir}
                  isPending={isSortPending}
                  onSort={handleSort}
                />
                <SortableColumnHeader
                  field="faculty"
                  label="Faculty"
                  activeSort={activeSort}
                  activeDir={activeDir}
                  isPending={isSortPending}
                  onSort={handleSort}
                />
                {mode !== "program-head" && (
                  <SortableColumnHeader
                    field="program"
                    label="Program"
                    activeSort={activeSort}
                    activeDir={activeDir}
                    isPending={isSortPending}
                    onSort={handleSort}
                  />
                )}
                <SortableColumnHeader
                  field="class"
                  label="Class"
                  activeSort={activeSort}
                  activeDir={activeDir}
                  isPending={isSortPending}
                  onSort={handleSort}
                />
                <SortableColumnHeader
                  field="term"
                  label="Term"
                  activeSort={activeSort}
                  activeDir={activeDir}
                  isPending={isSortPending}
                  onSort={handleSort}
                />
                <SortableColumnHeader
                  field="scope"
                  label="Scope"
                  activeSort={activeSort}
                  activeDir={activeDir}
                  isPending={isSortPending}
                  onSort={handleSort}
                />
                <SortableColumnHeader
                  field="status"
                  label="Status"
                  activeSort={activeSort}
                  activeDir={activeDir}
                  isPending={isSortPending}
                  onSort={handleSort}
                />
                <TableHead className="text-xs font-semibold tracking-widest uppercase">
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
                  selected={selection.selectedIds.has(assignment.id)}
                  onSelectedChange={(checked) => selection.toggleOne(assignment.id, checked)}
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
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base font-semibold">
              {confirmDialog.type === "delete" && (
                <AlertTriangle className="text-destructive size-5 shrink-0" aria-hidden="true" />
              )}
              {dialogTitle}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed">
              {dialogDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {confirmDialog.assignment && (
            <div className="bg-muted/60 divide-border/60 divide-y rounded-lg border text-sm">
              <div className="flex items-baseline justify-between gap-3 px-3.5 py-2.5">
                <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  Course
                </span>
                <span className="text-foreground text-right font-medium">
                  {confirmDialog.assignment.courseCode} - {confirmDialog.assignment.courseTitle}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3 px-3.5 py-2.5">
                <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  Faculty
                </span>
                <span className="text-foreground font-medium">
                  {confirmDialog.assignment.facultyName}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3 px-3.5 py-2.5">
                <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  Term
                </span>
                <span className="text-muted-foreground text-right tabular-nums">
                  {confirmDialog.assignment.termLabel}
                </span>
              </div>
            </div>
          )}

          {confirmDialog.type === "delete" && (
            <div className="flex flex-col gap-3">
              {deletionError && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">{deletionError}</AlertDescription>
                </Alert>
              )}
              {deletionPreflight ? (
                <>
                  <div className="bg-destructive/5 text-muted-foreground border-destructive/20 rounded-lg border p-3 text-xs leading-relaxed">
                    <p className="text-foreground font-medium">Roster and history impact:</p>
                    <p className="mt-1">
                      This permanently removes {deletionPreflight.activeMembershipCount} current
                      roster {deletionPreflight.activeMembershipCount === 1 ? "member" : "members"}
                      {deletionPreflight.removedMembershipCount > 0 &&
                        `, ${deletionPreflight.removedMembershipCount} removed history ${
                          deletionPreflight.removedMembershipCount === 1 ? "record" : "records"
                        }`}{" "}
                      and the roster&apos;s membership history. Student accounts and term placements
                      are not deleted.
                    </p>
                  </div>

                  {deletionPreflight.courseBoundEvaluationCount > 0 && (
                    <Alert variant="destructive">
                      <AlertDescription className="text-sm">
                        A Course-bound evaluation exists. Deactivate this assignment instead.
                      </AlertDescription>
                    </Alert>
                  )}
                  <Field>
                    <FieldLabel
                      htmlFor="assignment-delete-confirmation"
                      className="text-xs font-medium"
                    >
                      Type{" "}
                      <span className="text-foreground font-semibold select-all">
                        {deletionPreflight.label}
                      </span>{" "}
                      to confirm
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="assignment-delete-confirmation"
                        value={confirmationLabel}
                        onChange={(event) => setConfirmationLabel(event.target.value)}
                        placeholder={deletionPreflight.label}
                        className="font-mono text-sm"
                        autoComplete="off"
                      />
                    </FieldContent>
                    <FieldDescription className="text-muted-foreground text-[11px] leading-normal">
                      Enter the complete course assignment label to authorize permanent deletion.
                    </FieldDescription>
                  </Field>
                </>
              ) : !deletionError ? (
                <div className="text-muted-foreground flex items-center justify-center gap-2.5 py-4 text-xs">
                  <Spinner size="sm" label="Checking assignment state" />
                  <span>Checking assignment state…</span>
                </div>
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
                  confirmationLabel.trim() !== deletionPreflight.label.trim())
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
        <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
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
