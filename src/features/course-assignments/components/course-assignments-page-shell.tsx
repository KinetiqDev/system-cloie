"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarDays, Plus } from "lucide-react";
import { CourseAssignmentsTable } from "./course-assignments-table";
import { MobileFilterSheet, TableToolbar } from "@/components/data-table/table-toolbar";
import { facetIsApplied } from "@/components/data-table/types";
import { buildAssignmentFacets } from "./shared/assignment-facets";
import { CourseAssignmentFormDialog } from "./course-assignment-form-dialog";
import type { AssignmentFiltersState } from "./shared/assignment-filters";
import type {
  AssignableCourse,
  ListCourseAssignmentsResult,
} from "@/features/course-assignments/types";
import type { TermInstanceItem } from "@/features/academic-calendar/types";
import {
  courseAssignmentListPath,
  parseCourseAssignmentSortDirection,
  parseCourseAssignmentSortField,
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
  programCodes: string[];
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
  /** Periods offered by the creation wizard; defaults to every period. */
  assignableTermInstances?: TermInstanceItem[];
  activeTermInstanceId?: string | null;
  initialData: ListCourseAssignmentsResult | null;
  initialFilters: AssignmentFiltersState;
  initialPage: number;
  initialError?: string | null;
  selectedProgramId?: string;
  /** False renders a read-only list: no create entry points or form dialog. */
  canManageAssignments?: boolean;
  /**
   * The period the list itself falls back to when no period is chosen. Only a
   * role whose loader applies one (Program Head) supplies it; every other role
   * lists every period, and `activeTermInstanceId` is then just the creation
   * form's default.
   */
  listDefaultTermInstanceId?: string | null;
}

function CourseAssignmentsHeader({
  pageTitle,
  pageDescription,
  periodLabel,
}: {
  pageTitle: string;
  pageDescription: string;
  periodLabel?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
        <h1 className="text-heading-xl text-balance">{pageTitle}</h1>
        {periodLabel && (
          <Badge variant="outline" className="bg-card text-muted-foreground text-xs font-normal">
            <CalendarDays className="mr-1 size-3" aria-hidden="true" />
            <span>{periodLabel}</span>
          </Badge>
        )}
      </div>
      <p className="text-body-sm text-text-secondary max-w-2xl leading-relaxed text-pretty">
        {pageDescription}
      </p>
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
  assignableTermInstances = termInstances,
  activeTermInstanceId,
  initialData,
  initialFilters,
  initialPage,
  initialError = null,
  selectedProgramId,
  canManageAssignments = true,
  listDefaultTermInstanceId = null,
}: CourseAssignmentsPageShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [filters, setFilters] = useState<AssignmentFiltersState>(initialFilters);
  const [searchDraft, setSearchDraft] = useState(initialFilters.searchQuery);
  const role: CourseAssignmentListRole = mode;
  // Sorting is owned by the table's column headers via URL params; filter and
  // page navigations carry the active sort so it survives those transitions.
  const activeSort = parseCourseAssignmentSortField(searchParams.get("sort"));
  const activeDir = parseCourseAssignmentSortDirection(searchParams.get("dir")) ?? "asc";
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
        ...(activeSort !== undefined && { sort: activeSort, dir: activeDir }),
      };
      router[navigation](courseAssignmentListPath(pathname, nextState, role));
    },
    [activeDir, activeSort, pathname, role, router]
  );

  const handleSearchDraftChange = useCallback((value: string) => setSearchDraft(value), []);

  // Search commits after a quiet pause. Watching the committed filters keeps the
  // timer reading current state without a ref, and re-arms it whenever another
  // facet changes so a pending draft never lands on stale filters.
  useEffect(() => {
    if (searchDraft === filters.searchQuery) return;
    const timer = window.setTimeout(() => {
      const next = { ...filters, searchQuery: searchDraft };
      setFilters(next);
      navigateWithState(next, 0, "replace");
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft, filters, navigateWithState]);

  // Navigation stays outside the state updater. React may invoke an updater
  // during its render phase, and pushing a route there updates the Router
  // while this component renders — the state update belongs to the event, not
  // to the render.
  const updateFilter = useCallback(
    <K extends keyof AssignmentFiltersState>(key: K, value: AssignmentFiltersState[K]) => {
      const next = { ...filters, [key]: value };
      setFilters(next);
      navigateWithState(next, 0, "push");
    },
    [filters, navigateWithState]
  );

  // The Class column carries two facets off one state, so its popover clear
  // composes both into the same single write + navigation as the toolbar's
  // clear-all. Clearing facet-by-facet would push one route per key from the
  // same stale snapshot and drop all but the last.
  const clearClassFacets = useCallback(() => {
    const next = { ...filters, yearLevel: null, section: null };
    setFilters(next);
    navigateWithState(next, 0, "push");
  }, [filters, navigateWithState]);
  const { byColumn: facets, all: allFacets } = buildAssignmentFacets(filters, updateFilter, {
    availableCourses,
    availablePrograms,
    availableFaculty,
    termInstances,
    showProgramFilter: mode === "all-program" || mode === "general-education",
    hideCourseScopeFilter: mode === "general-education",
    defaultTermInstanceId: listDefaultTermInstanceId ?? null,
  });

  // One cleared state, one navigation: clearing facet by facet would push a
  // route change per key and leave the browser history full of intermediate
  // steps.
  const handleClearAll = useCallback(() => {
    const cleared: AssignmentFiltersState = {
      termInstanceId: listDefaultTermInstanceId ?? null,
      courseId: null,
      facultyId: null,
      programId: null,
      yearLevel: null,
      section: null,
      isActive: null,
      courseScope: null,
      hasActiveRosterMembers: undefined,
      searchQuery: "",
    };
    setSearchDraft("");
    setFilters(cleared);
    navigateWithState(cleared, 0, "push");
  }, [listDefaultTermInstanceId, navigateWithState]);

  const selectedTerm = termInstances.find((term) => term.id === filters.termInstanceId);
  const periodLabel = selectedTerm
    ? formatTermInstanceLabel(selectedTerm.schoolYearCode, selectedTerm.semester, selectedTerm.term)
    : "All Academic Periods";

  return (
    <div className="flex min-w-0 flex-col gap-5 overflow-x-clip sm:gap-6">
      <CourseAssignmentsHeader
        pageTitle={pageTitle}
        pageDescription={pageDescription}
        periodLabel={periodLabel}
      />

      <TableToolbar
        search={{
          id: "assignment-search",
          label: "Search assignments",
          placeholder:
            mode === "program-head"
              ? "Search course or faculty"
              : "Search course, faculty, or program",
          value: searchDraft,
          onChange: handleSearchDraftChange,
        }}
        facets={allFacets}
        onClearAll={handleClearAll}
        actions={
          canManageAssignments ? (
            <Button
              onClick={() => setCreateOpen(true)}
              className="w-full shrink-0 shadow-xs sm:w-auto"
              size="default"
            >
              <Plus data-icon="inline-start" aria-hidden="true" />
              Assign Faculty
            </Button>
          ) : undefined
        }
        resultSummary={
          <p className="text-muted-foreground text-xs tabular-nums">
            <span className="text-foreground font-medium">{total}</span>{" "}
            {total === 1 ? "assignment" : "assignments"}
            {Math.ceil(total / pageSize) > 1 && (
              <>
                <span className="text-border-strong mx-1.5">·</span>
                <span>
                  Page {page + 1} of {Math.ceil(total / pageSize)}
                </span>
              </>
            )}
          </p>
        }
      >
        <div className="md:hidden">
          <MobileFilterSheet
            facets={allFacets}
            activeCount={allFacets.filter(facetIsApplied).length}
            onClearAll={handleClearAll}
            summary="Show results"
          />
        </div>
      </TableToolbar>

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
        facets={facets}
        onClearColumn={{ class: clearClassFacets }}
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
          termInstances={assignableTermInstances}
          defaultTermInstanceId={activeTermInstanceId}
          mode={mode}
          onSuccess={refreshAssignments}
          selectedProgramId={selectedProgramId}
        />
      )}
    </div>
  );
}
