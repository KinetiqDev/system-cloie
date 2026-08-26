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
    ? availablePrograms.find((p) => p.id === selectedProgramId) ?? null
    : null;
  const activeCount = assignments.filter((a) => a.isActive).length;
  const inactiveCount = total > 0 ? total - activeCount : 0;

  return (
    <div className="flex min-w-0 flex-col gap-6 overflow-hidden">
      {/* Header — institutional, calm, program-aware */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          {mode === "program-head" && selectedProgram && (
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span
                className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border bg-primary/8 px-2.5 py-1 text-xs font-semibold tracking-wide text-primary ring-1 ring-primary/15"
                title={`${selectedProgram.code} — ${selectedProgram.name}`}
              >
                <GraduationCap className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 truncate">{selectedProgram.code} · {selectedProgram.name}</span>
              </span>
              <span className="hidden size-1 rounded-full bg-border sm:block" aria-hidden="true" />
              <span className="text-label-sm text-muted-foreground hidden sm:inline">
                Program scope
              </span>
            </div>
          )}
          {mode === "program-head" && !selectedProgram && (
            <p className="text-label-sm font-medium tracking-widest uppercase text-muted-foreground">
              Program assignments
            </p>
          )}
          <h1 className="text-heading-lg tracking-tight">{pageTitle}</h1>
          <p className="text-body-sm max-w-2xl text-text-secondary leading-relaxed">
            {pageDescription}
          </p>
          {mode === "program-head" && (
            <p className="text-xs leading-relaxed text-muted-foreground max-w-2xl">
              Each assignment connects a faculty member to a course and class section for a term.
              The class roster unlocks evaluations and attainment evidence.
            </p>
          )}
        </div>
        {canManageAssignments && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              onClick={() => setCreateOpen(true)}
              className="min-h-11 w-full shadow-sm sm:w-auto"
              size="default"
            >
              <Plus aria-hidden="true" className="size-4" />
              Assign Faculty
            </Button>
          </div>
        )}
      </div>

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

      {/* Summary strip — count + period context */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card px-3 py-3 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border">
            <Users className="size-4" aria-hidden="true" />
          </div>
          <div className="flex min-w-0 flex-col">
            <p className="text-sm font-semibold tabular-nums leading-none truncate">
              {total} {total === 1 ? "assignment" : "assignments"}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums truncate">
              {total === 0 ? (
                "No records in current view"
              ) : (
                <>
                  <span className="font-medium text-foreground">{activeCount} active</span>
                  {inactiveCount > 0 && (
                    <>
                      <span className="mx-1.5 text-border-strong">·</span>
                      <span>{inactiveCount} inactive</span>
                    </>
                  )}
                  <span className="mx-1.5 hidden text-border-strong sm:inline">·</span>
                  <span className="hidden sm:inline">page {page + 1}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2 sm:shrink-0">
          <Badge
            variant="outline"
            className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-xs font-medium"
            title={periodLabel}
          >
            <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0 truncate">{periodLabel}</span>
          </Badge>
        </div>
      </div>

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
