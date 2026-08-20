"use client";

import { useState } from "react";
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
  initialData: ListCourseAssignmentsResult | null;
  initialFilters: AssignmentFiltersState;
  initialPage: number;
  initialError?: string | null;
  selectedProgramId?: string;
}

export function CourseAssignmentsPageShell({
  pageTitle,
  pageDescription,
  mode,
  availableCourses,
  availablePrograms,
  availableFaculty,
  termInstances,
  initialData,
  initialFilters,
  initialPage,
  initialError = null,
  selectedProgramId,
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

  const navigateWithState = (nextFilters: AssignmentFiltersState, nextPage: number) => {
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
        ...(nextFilters.searchQuery.trim() && { q: nextFilters.searchQuery.trim() }),
      },
      ...((role === "all-program" || role === "general-education") && nextFilters.isActive === null
        ? { isActiveMode: "all" as const }
        : {}),
    };
    router.push(courseAssignmentListPath(pathname, nextState, role));
  };

  const handleFiltersChange = (next: AssignmentFiltersState) => {
    setFilters(next);
    navigateWithState(next, 0);
  };

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="text-muted-foreground mt-1">{pageDescription}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Assign Faculty
          </Button>
        </div>
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
        onAssignFaculty={() => setCreateOpen(true)}
        selectedProgramId={selectedProgramId}
      />

      <CourseAssignmentFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        availableCourses={availableCourses}
        availablePrograms={availablePrograms}
        termInstances={termInstances}
        mode={mode}
        onSuccess={refreshAssignments}
        selectedProgramId={selectedProgramId}
      />
    </div>
  );
}
