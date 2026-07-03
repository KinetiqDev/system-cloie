"use client";

import { useState, useEffect, useCallback } from "react";
import { YearLevel, StudentSection } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CourseAssignmentsTable } from "./course-assignments-table";
import { AssignmentFilters } from "./shared/assignment-filters";
import { CourseAssignmentFormDialog } from "./course-assignment-form-dialog";
import { listCourseAssignmentsAction } from "@/lib/actions/course-assignment-actions";
import type { AssignmentFiltersState } from "./shared/assignment-filters";
import type { CourseAssignmentItem, AssignableCourse } from "@/features/course-assignments/types";
import type { TermInstanceItem } from "@/features/academic-calendar/types";

interface ProgramOption {
  id: string;
  code: string;
  name: string;
}

interface FacultyOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export type CourseAssignmentsPageMode = "all-program" | "program-head";

export interface CourseAssignmentsPageShellProps {
  pageTitle: string;
  pageDescription: string;
  mode: CourseAssignmentsPageMode;
  defaultIsActive: boolean | null;
  availableCourses: AssignableCourse[];
  availablePrograms: ProgramOption[];
  availableFaculty: FacultyOption[];
  termInstances: TermInstanceItem[];
}

export function CourseAssignmentsPageShell({
  pageTitle,
  pageDescription,
  mode,
  defaultIsActive,
  availableCourses,
  availablePrograms,
  availableFaculty,
  termInstances,
}: CourseAssignmentsPageShellProps) {
  const [filters, setFilters] = useState<AssignmentFiltersState>({
    termInstanceId: null,
    courseId: null,
    facultyId: null,
    programId: null,
    yearLevel: null,
    section: null,
    isActive: defaultIsActive,
    courseScope: null,
    searchQuery: "",
  });
  const [page, setPage] = useState(0);
  const [assignments, setAssignments] = useState<CourseAssignmentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshAssignments = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchAssignments() {
      setLoading(true);
      try {
        const result = await listCourseAssignmentsAction(
          {
            ...(filters.termInstanceId && { termInstanceId: filters.termInstanceId }),
            ...(filters.courseId && { courseId: filters.courseId }),
            ...(filters.facultyId && { facultyId: filters.facultyId }),
            ...(filters.programId && { programId: filters.programId }),
            ...(filters.yearLevel && { yearLevel: filters.yearLevel as YearLevel }),
            ...(filters.section && { section: filters.section as StudentSection }),
            ...(filters.isActive !== null && { isActive: filters.isActive }),
            ...(filters.courseScope && { courseScope: filters.courseScope }),
          },
          { page }
        );

        if (!cancelled) {
          if (result.success) {
            const lastValidPage = Math.max(
              0,
              Math.ceil(result.data.total / result.data.pageSize) - 1
            );

            if (result.data.total > 0 && page > lastValidPage) {
              setLoadError(null);
              setPage(lastValidPage);
              return;
            }

            setLoadError(null);
            setAssignments(result.data.items);
            setTotal(result.data.total);
          } else {
            setLoadError(result.error);
            setAssignments([]);
            setTotal(0);
          }
        }
      } catch {
        if (!cancelled) {
          setLoadError("Failed to load course assignments.");
          setAssignments([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchAssignments();

    return () => {
      cancelled = true;
    };
  }, [filters, page, refreshTrigger]);

  const handleFiltersChange = (next: AssignmentFiltersState) => {
    setFilters(next);
    setPage(0);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
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
      />

      {loadError && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      <CourseAssignmentsTable
        assignments={assignments}
        total={total}
        page={page}
        loading={loading}
        mode={mode}
        availableCourses={availableCourses}
        availablePrograms={availablePrograms}
        onPageChange={setPage}
        onAssignmentUpdated={refreshAssignments}
        onAssignFaculty={() => setCreateOpen(true)}
      />

      <CourseAssignmentFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        availableCourses={availableCourses}
        availablePrograms={availablePrograms}
        termInstances={termInstances}
        mode={mode}
        onSuccess={refreshAssignments}
      />
    </div>
  );
}
