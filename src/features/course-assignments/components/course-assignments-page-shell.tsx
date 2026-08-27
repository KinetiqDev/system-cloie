"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, GraduationCap, Plus, Users } from "lucide-react";
import { CourseAssignmentsTable } from "./course-assignments-table";
import { AssignmentFilters } from "./shared/assignment-filters";
import { CourseAssignmentFormDialog } from "./course-assignment-form-dialog";
import type { AssignmentFiltersState } from "./shared/assignment-filters";
import type {
  AssignableCourse,
  ListCourseAssignmentsResult,
} from "@/features/course-assignments/types";
import type { TermInstanceItem } from "@/features/academic-calendar/types";
import {
  courseAssignmentListPath,
  type CourseAssignmentListRole,
} from "../course-assignment-list-state";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";

interface ProgramOption {
  id: string;
  code: string;
  name: string;
}

interface FacultyOption {
  id: string;
  name: string;
  email: string;
}

export type CourseAssignmentsPageMode = "all-program" | "program-head" | "general-education";

export interface CourseAssignmentsPageShellProps {
  pageTitle: string;
  pageDescription: string;
  mode: CourseAssignmentsPageMode;
  availableCourses: AssignableCourse[];
  availablePrograms: ProgramOption[];
  availableFaculty: FacultyOption[];
  termInstances: TermInstanceItem[];
  activeTermInstanceId?: string | null;
  initialData: ListCourseAssignmentsResult | null;
  initialFilters: AssignmentFiltersState;
  initialPage: number;
  initialError?: string | null;
  selectedProgramId?: string;
  /** False renders a read-only list: no create entry points or form dialog. */
  canManageAssignments?: boolean;
}

function AssignmentSummaryStrip({
  total,
  assignments,
  page,
  pageSize,
  periodLabel,
}: {
  total: number;
  assignments: Array<{ isActive: boolean }>;
  page: number;
  pageSize: number;
  periodLabel: string;
}) {
  const activeCount = assignments.filter((a) => a.isActive).length;
  const inactiveCount = total > 0 ? total - activeCount : 0;
  const isSinglePage = total <= pageSize;
  const showStatusBreakdown = isSinglePage && total > 0;

  return (
    <div className="bg-card flex flex-col gap-3 rounded-xl border px-3 py-3 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="bg-muted text-muted-foreground ring-border flex size-9 shrink-0 items-center justify-center rounded-lg ring-1">
          <Users className="size-4" aria-hidden="true" />
        </div>
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-sm leading-none font-semibold tabular-nums">
            {total} {total === 1 ? "assignment" : "assignments"}
          </p>
          <p className="text-muted-foreground truncate text-xs tabular-nums">
            {total === 0 ? (
              "No records in current view"
            ) : showStatusBreakdown ? (
              <>
                <span className="text-foreground font-medium">{activeCount} active</span>
                {inactiveCount > 0 && (
                  <>
                    <span className="text-border-strong mx-1.5">·</span>
                    <span>{inactiveCount} inactive</span>
                  </>
                )}
                <span className="text-border-strong mx-1.5 hidden sm:inline">·</span>
                <span className="hidden sm:inline">page {page + 1}</span>
              </>
            ) : (
              <span>page {page + 1}</span>
            )}
          </p>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2 sm:shrink-0">
        <Badge
          variant="outline"
          className="bg-background inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
          title={periodLabel}
        >
          <CalendarDays className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">{periodLabel}</span>
        </Badge>
      </div>
    </div>
  );
}

function CourseAssignmentsHeader({
  mode,
  selectedProgram,
  pageTitle,
  pageDescription,
  canManageAssignments,
  onCreate,
}: {
  mode: CourseAssignmentsPageMode;
  selectedProgram: ProgramOption | null;
  pageTitle: string;
  pageDescription: string;
  canManageAssignments: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        {mode === "program-head" && selectedProgram && (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span
              className="bg-primary/8 text-primary ring-primary/15 inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide ring-1"
              title={`${selectedProgram.code} — ${selectedProgram.name}`}
            >
              <GraduationCap className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">
                {selectedProgram.code} · {selectedProgram.name}
              </span>
            </span>
            <span className="bg-border hidden size-1 rounded-full sm:block" aria-hidden="true" />
            <span className="text-label-sm text-muted-foreground hidden sm:inline">
              Program scope
            </span>
          </div>
        )}
        {mode === "program-head" && !selectedProgram && (
          <p className="text-label-sm text-muted-foreground font-medium tracking-widest uppercase">
            Program assignments
          </p>
        )}
        <h1 className="text-heading-lg tracking-tight">{pageTitle}</h1>
        <p className="text-body-sm text-text-secondary max-w-2xl leading-relaxed">
          {pageDescription}
        </p>
        {mode === "program-head" && (
          <p className="text-muted-foreground max-w-2xl text-xs leading-relaxed">
            Each assignment connects a faculty member to a course and class section for a term. The
            class roster unlocks evaluations and attainment evidence.
          </p>
        )}
      </div>
      {canManageAssignments && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button onClick={onCreate} className="min-h-11 w-full shadow-sm sm:w-auto" size="default">
            <Plus aria-hidden="true" className="size-4" />
            Assign Faculty
          </Button>
        </div>
      )}
    </div>
  );
}

export function CourseAssignmentsPageShell({
  pageTitle,
  pageDescription,
  mode,
  availableCourses,
  availablePrograms,
  availableFaculty,
  termInstances,
  activeTermInstanceId,
  initialData,
  initialFilters,
  initialPage,
  initialError = null,
  selectedProgramId,
  canManageAssignments = true,
}: CourseAssignmentsPageShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [createOpen, setCreateOpen] = useState(false);
  const [filters, setFilters] = useState<AssignmentFiltersState>(initialFilters);
  const role: CourseAssignmentListRole = mode;
  const assignments = initialData?.items ?? [];
  const total = initialData?.total ?? 0;
  const page = initialData?.page ?? initialPage - 1;
  const pageSize = initialData?.pageSize ?? 20;
  const loadError = initialError;

  const refreshAssignments = () => router.refresh();

  const navigateWithState = useCallback(
    // URL serialization keeps role-specific defaults atomic with each filter navigation.
    // fallow-ignore-next-line complexity
    (
      nextFilters: AssignmentFiltersState,
      nextPage: number,
      navigation: "push" | "replace" = "push"
    ) => {
      const nextState = {
        page: nextPage + 1,
        filters: {
          ...(nextFilters.termInstanceId && { termInstanceId: nextFilters.termInstanceId }),
          ...(nextFilters.courseId && { courseId: nextFilters.courseId }),
          ...(nextFilters.facultyId && { facultyId: nextFilters.facultyId }),
          ...(nextFilters.programId && { programId: nextFilters.programId }),
          ...(nextFilters.yearLevel && { yearLevel: nextFilters.yearLevel }),
          ...(nextFilters.section && { section: nextFilters.section }),
          ...(nextFilters.isActive !== null && { isActive: nextFilters.isActive }),
          ...(nextFilters.courseScope && { courseScope: nextFilters.courseScope }),
          ...(nextFilters.hasActiveRosterMembers === false && {
            hasActiveRosterMembers: false,
          }),
          ...(nextFilters.searchQuery.trim() && { q: nextFilters.searchQuery.trim() }),
        },
        ...(role === "program-head" && !nextFilters.termInstanceId
          ? { termInstanceMode: "all" as const }
          : {}),
        ...((role === "all-program" || role === "general-education") &&
        nextFilters.isActive === null
          ? { isActiveMode: "all" as const }
          : {}),
      };
      router[navigation](courseAssignmentListPath(pathname, nextState, role));
    },
    [pathname, role, router]
  );

  const handleFiltersChange = useCallback(
    (next: AssignmentFiltersState, navigation: "push" | "replace" = "push") => {
      setFilters(next);
      navigateWithState(next, 0, navigation);
    },
    [navigateWithState]
  );

  const selectedTerm = termInstances.find((term) => term.id === filters.termInstanceId);
  const periodLabel = selectedTerm
    ? formatTermInstanceLabel(selectedTerm.schoolYearCode, selectedTerm.semester, selectedTerm.term)
    : "All Academic Periods";
  const selectedProgram = selectedProgramId
    ? (availablePrograms.find((p) => p.id === selectedProgramId) ?? null)
    : null;

  return (
    <div className="flex min-w-0 flex-col gap-6 overflow-hidden">
      <CourseAssignmentsHeader
        mode={mode}
        selectedProgram={selectedProgram}
        pageTitle={pageTitle}
        pageDescription={pageDescription}
        canManageAssignments={canManageAssignments}
        onCreate={() => setCreateOpen(true)}
      />

      <AssignmentFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        availableCourses={availableCourses}
        availablePrograms={availablePrograms}
        availableFaculty={availableFaculty}
        termInstances={termInstances}
        showProgramFilter={mode === "all-program" || mode === "general-education"}
        hideCourseScopeFilter={mode === "general-education"}
        defaultTermInstanceId={activeTermInstanceId}
      />

      <AssignmentSummaryStrip
        total={total}
        assignments={assignments}
        page={page}
        pageSize={pageSize}
        periodLabel={periodLabel}
      />

      {loadError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load course assignments</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <CourseAssignmentsTable
        assignments={assignments}
        total={total}
        page={page}
        pageSize={pageSize}
        loading={false}
        mode={mode}
        availableCourses={availableCourses}
        availablePrograms={availablePrograms}
        onPageChange={(nextPage) => navigateWithState(filters, nextPage)}
        onAssignmentUpdated={refreshAssignments}
        onAssignFaculty={canManageAssignments ? () => setCreateOpen(true) : undefined}
        canManageAssignments={canManageAssignments}
        selectedProgramId={selectedProgramId}
      />

      {canManageAssignments && (
        <CourseAssignmentFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          availableCourses={availableCourses}
          availablePrograms={availablePrograms}
          termInstances={termInstances}
          defaultTermInstanceId={activeTermInstanceId}
          mode={mode}
          onSuccess={refreshAssignments}
          selectedProgramId={selectedProgramId}
        />
      )}
    </div>
  );
}
