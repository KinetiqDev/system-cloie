"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus } from "lucide-react";
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-heading-lg">{pageTitle}</h1>
          <p className="text-body-sm text-text-secondary">{pageDescription}</p>
        </div>
        {canManageAssignments && (
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setCreateOpen(true)}>
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

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="font-medium">
          {total} {total === 1 ? "assignment" : "assignments"}
        </p>
        <p className="text-muted-foreground">{periodLabel}</p>
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
