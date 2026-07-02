"use client";

import { useState, useEffect, useCallback } from "react";
import { YearLevel, StudentSection } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CourseAssignmentsTable } from "@/features/course-assignments/components/course-assignments-table";
import { AssignmentFilters } from "@/features/course-assignments/components/shared/assignment-filters";
import { CourseAssignmentFormDialog } from "@/features/course-assignments/components/course-assignment-form-dialog";
import { listCourseAssignmentsForProgramHeadAction } from "@/lib/actions/course-assignment-actions";
import type { AssignmentFiltersState } from "@/features/course-assignments/components/shared/assignment-filters";
import type { CourseAssignmentItem, AssignableCourse } from "@/features/course-assignments/types";
import type { TermInstanceItem } from "@/features/academic-calendar/types";

interface CourseAssignmentsClientPageProps {
  availableCourses: AssignableCourse[];
  availablePrograms: Array<{ id: string; code: string; name: string }>;
  availableFaculty: Array<{ id: string; firstName: string; lastName: string; email: string }>;
  termInstances: TermInstanceItem[];
}

const DEFAULT_FILTERS: AssignmentFiltersState = {
  termInstanceId: null,
  courseId: null,
  facultyId: null,
  programId: null,
  yearLevel: null,
  section: null,
  searchQuery: "",
};

export function CourseAssignmentsClientPage({
  availableCourses,
  availablePrograms,
  availableFaculty,
  termInstances,
}: CourseAssignmentsClientPageProps) {
  const [filters, setFilters] = useState<AssignmentFiltersState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const [assignments, setAssignments] = useState<CourseAssignmentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshAssignments = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchAssignments() {
      setLoading(true);
      const result = await listCourseAssignmentsForProgramHeadAction(
        {
          ...(filters.termInstanceId && { termInstanceId: filters.termInstanceId }),
          ...(filters.courseId && { courseId: filters.courseId }),
          ...(filters.facultyId && { facultyId: filters.facultyId }),
          ...(filters.programId && { programId: filters.programId }),
          ...(filters.yearLevel && { yearLevel: filters.yearLevel as YearLevel }),
          ...(filters.section && { section: filters.section as StudentSection }),
        },
        { page }
      );

      if (!cancelled) {
        if (result.success) {
          setAssignments(result.data.items);
          setTotal(result.data.total);
        }
        setLoading(false);
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
          <h1 className="text-2xl font-bold tracking-tight">Course Assignments</h1>
          <p className="text-muted-foreground mt-1">
            Manage faculty assignments for courses in your program
          </p>
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

      <CourseAssignmentsTable
        assignments={assignments}
        total={total}
        page={page}
        loading={loading}
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
        onSuccess={refreshAssignments}
      />
    </div>
  );
}
