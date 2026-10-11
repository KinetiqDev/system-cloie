// fallow-ignore-file code-duplication
"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CourseScope } from "@prisma/client";
import {
  BookOpen,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  MoreVertical,
  Pencil,
  Plus,
  Library,
  Power,
  Trash2,
} from "lucide-react";
import { getYearLevelDisplay } from "@/lib/constants/year-levels";
import { getSemesterLabel, getTermLabel } from "@/lib/constants/academic";
import { SCHEDULE_FILTER_ALL, matchesScheduleFilters } from "./course-schedule-filters";
import { FilterableHead } from "@/components/data-table/filterable-head";
import { MobileFilterSheet, TableToolbar } from "@/components/data-table/table-toolbar";
import { facetIsApplied } from "@/components/data-table/types";
import {
  courseArchiveStatusFacet,
  courseMajorFacet,
  courseProgramFacet,
  courseScheduleFacets,
  courseScopeFacet,
} from "./course-catalog-facets";

import { CourseImportDialog } from "@/features/academic-structure/components/course-import-dialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  bulkToggleCoursesActiveAction,
  toggleCourseActiveAction,
  deleteCourseAction,
} from "@/lib/actions/management-foundation-actions";
import { getCourseScopeBadgeClass } from "@/features/academic-structure/lib/course-visuals";
import { CourseCreateDialog } from "@/features/academic-structure/components/course-create-dialog";
import { CourseEditDialog } from "@/features/academic-structure/components/course-edit-dialog";
import { showToast } from "@/components/ui/toast";
import { useTableSelection } from "@/hooks/use-table-selection";

import type {
  ManagementCourseSummaryItem,
  ManagementCoursesKPI,
  ProgramFilterOption,
} from "@/features/academic-structure/services/list-management-courses-summary";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 15;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type ManagementCoursesListProps = {
  courses: ManagementCourseSummaryItem[];
  kpi: ManagementCoursesKPI;
  programs: ProgramFilterOption[];
  /** Base path for course links (e.g. "/secretary/courses" or "/dean/courses") */
  basePath?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// Pre-existing tracked debt (main baseline: complexity_moderate/crap_moderate);
// schedule filters now share course-schedule-filters, residual scope/program/
// major/search/bulk/dialog branching stays cohesive here. Refactor tracked
// under issue #174 scope.
// fallow-ignore-next-line complexity
export function ManagementCoursesList({
  courses,
  kpi,
  programs,
  basePath = "/secretary/courses",
}: ManagementCoursesListProps) {
  const showEvaluationCount = !basePath.startsWith("/dean/");
  // Secretary edits in place via modal; dean keeps the dedicated edit page.
  const editInModal = basePath === "/secretary/courses";
  const canImportCourses = editInModal;
  // ---- Filter state -------------------------------------------------------
  const [scopeFilter, setScopeFilter] = useState<string>(SCHEDULE_FILTER_ALL);
  const [programFilter, setProgramFilter] = useState<string>(SCHEDULE_FILTER_ALL);
  const [majorFilter, setMajorFilter] = useState<string>(SCHEDULE_FILTER_ALL);
  const [yearLevelFilter, setYearLevelFilter] = useState<string>(SCHEDULE_FILTER_ALL);
  const [semesterFilter, setSemesterFilter] = useState<string>(SCHEDULE_FILTER_ALL);
  const [termFilter, setTermFilter] = useState<string>(SCHEDULE_FILTER_ALL);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(SCHEDULE_FILTER_ALL);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [courseToDelete, setCourseToDelete] = useState<{ id: string; code: string } | null>(null);
  const [courseToEdit, setCourseToEdit] = useState<ManagementCourseSummaryItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // ---- Derived: majors for selected program --------------------------------
  const selectedProgram = programs.find((p) => p.id === programFilter);
  const availableMajors = selectedProgram?.majors ?? [];

  // ---- Filtered courses ----------------------------------------------------
  const filteredCourses = useMemo(() => {
    let result = courses;

    if (statusFilter === "active") {
      result = result.filter((c) => c.isActive);
    } else if (statusFilter === "inactive") {
      result = result.filter((c) => !c.isActive);
    }

    if (scopeFilter === "general_education") {
      result = result.filter((c) => c.courseScope === CourseScope.GENERAL_EDUCATION);
    } else if (scopeFilter === "professional") {
      result = result.filter((c) => c.courseScope === CourseScope.PROFESSIONAL);
    }

    if (programFilter !== SCHEDULE_FILTER_ALL) {
      result = result.filter((c) => c.programId === programFilter);
    }

    if (majorFilter !== SCHEDULE_FILTER_ALL) {
      result = result.filter((c) => c.majorId === majorFilter);
    }

    result = result.filter((c) =>
      matchesScheduleFilters(
        {
          yearLevel: c.defaultYearLevel,
          semester: c.defaultSemester,
          term: c.defaultTerm,
        },
        { yearLevel: yearLevelFilter, semester: semesterFilter, term: termFilter }
      )
    );

    // Search by code or title
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (c) => c.code.toLowerCase().includes(term) || c.title.toLowerCase().includes(term)
      );
    }

    return result;
  }, [
    courses,
    scopeFilter,
    programFilter,
    majorFilter,
    yearLevelFilter,
    semesterFilter,
    termFilter,
    statusFilter,
    searchTerm,
  ]);

  // ---- Pagination ----------------------------------------------------------
  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCourses = filteredCourses.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selection = useTableSelection(
    paginatedCourses.map((course) => course.id),
    `${scopeFilter}:${programFilter}:${majorFilter}:${yearLevelFilter}:${semesterFilter}:${termFilter}:${statusFilter}:${searchTerm}:${safePage}`
  );

  const handleScopeChange = (value: string | null) => {
    setScopeFilter(value ?? SCHEDULE_FILTER_ALL);
    setCurrentPage(1);
  };

  const handleProgramChange = (value: string | null) => {
    setProgramFilter(value ?? SCHEDULE_FILTER_ALL);
    setMajorFilter(SCHEDULE_FILTER_ALL);
    setCurrentPage(1);
  };

  const handleMajorChange = (value: string | null) => {
    setMajorFilter(value ?? SCHEDULE_FILTER_ALL);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setScopeFilter(SCHEDULE_FILTER_ALL);
    setProgramFilter(SCHEDULE_FILTER_ALL);
    setMajorFilter(SCHEDULE_FILTER_ALL);
    setYearLevelFilter(SCHEDULE_FILTER_ALL);
    setSemesterFilter(SCHEDULE_FILTER_ALL);
    setTermFilter(SCHEDULE_FILTER_ALL);
    setStatusFilter(SCHEDULE_FILTER_ALL);
    setSearchTerm("");
    setCurrentPage(1);
  };

  const setScheduleFacet = (key: "yearLevel" | "semester" | "term", value: string | null) => {
    const next = value ?? SCHEDULE_FILTER_ALL;
    if (key === "yearLevel") setYearLevelFilter(next);
    if (key === "semester") {
      setSemesterFilter(next);
      // Summer has no terms, so mirror the shared schedule predicate's rule.
      if (next === "SUMMER") setTermFilter(SCHEDULE_FILTER_ALL);
    }
    if (key === "term") setTermFilter(next);
    setCurrentPage(1);
  };

  const scheduleFacets = courseScheduleFacets(
    {
      yearLevel: yearLevelFilter,
      semester: semesterFilter,
      term: termFilter,
    },
    setScheduleFacet,
    SCHEDULE_FILTER_ALL
  );
  const facets = {
    course: [],
    scope: [courseScopeFacet(scopeFilter, handleScopeChange, SCHEDULE_FILTER_ALL)],
    program: [
      courseProgramFacet(programFilter, handleProgramChange, SCHEDULE_FILTER_ALL, programs),
    ],
    major: [courseMajorFacet(majorFilter, handleMajorChange, SCHEDULE_FILTER_ALL, availableMajors)],
    class: [scheduleFacets.yearLevel, scheduleFacets.semester, scheduleFacets.term],
    status: [
      courseArchiveStatusFacet(
        statusFilter,
        (value) => {
          setStatusFilter(value ?? SCHEDULE_FILTER_ALL);
          setCurrentPage(1);
        },
        SCHEDULE_FILTER_ALL
      ),
    ],
  };
  const allFacets = Object.values(facets).flat();

  // ---- Action handlers -----------------------------------------------------
  const handleToggleActive = (courseId: string, currentActive: boolean) => {
    startTransition(async () => {
      await toggleCourseActiveAction(courseId, !currentActive);
      selection.clearSelection();
    });
  };

  const confirmDelete = () => {
    if (!courseToDelete) return;
    const courseId = courseToDelete.id;
    setCourseToDelete(null);
    startTransition(async () => {
      await deleteCourseAction(courseId);
    });
  };
  const handleBulkStatus = (isActive: boolean) => {
    const ids = [...selection.selectedIds];
    startTransition(async () => {
      const result = await bulkToggleCoursesActiveAction(ids, isActive);
      if (result.failed.length > 0) {
        showToast(
          `${result.succeeded.length} updated; ${result.failed.length} could not be updated.`,
          "warning"
        );
      } else {
        showToast(`${result.succeeded.length} courses ${isActive ? "activated" : "deactivated"}.`);
      }
      selection.clearSelection();
    });
  };

  // ---- Render --------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-xl text-balance">Courses</h1>
        <p className="text-body-sm text-text-secondary max-w-3xl text-pretty">
          Manage the shared course catalog for general education, program-wide, and major-specific
          contexts.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Total Courses"
          value={kpi.totalCourses}
          icon={<BookOpen className="text-muted-foreground size-5" />}
        />
        <KPICard
          label="Active Courses"
          value={kpi.activeCourses}
          icon={<Layers className="text-muted-foreground size-5" />}
        />
        <KPICard
          label="General Education"
          value={kpi.generalEducationCourses}
          icon={<Library className="text-muted-foreground size-5" />}
        />
        <KPICard
          label="Professional"
          value={kpi.professionalCourses}
          icon={<GraduationCap className="text-muted-foreground size-5" />}
        />
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canImportCourses && (
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet aria-hidden="true" />
            Import CSV
          </Button>
        )}
        <Button onClick={() => setCreateOpen(true)}>
          <Plus aria-hidden="true" />
          Add Course
        </Button>
      </div>

      <TableToolbar
        search={{
          id: "course-search",
          label: "Search courses",
          placeholder: "Search by code or title...",
          value: searchTerm,
          onChange: handleSearchChange,
        }}
        facets={allFacets}
        onClearAll={clearFilters}
        resultSummary={
          <p className="text-muted-foreground text-xs tabular-nums">
            <span className="text-foreground font-medium">{filteredCourses.length}</span>{" "}
            {filteredCourses.length === 1 ? "course" : "courses"}
          </p>
        }
      >
        <div className="md:hidden">
          <MobileFilterSheet
            facets={allFacets}
            activeCount={allFacets.filter(facetIsApplied).length}
            onClearAll={clearFilters}
            summary="Show results"
          />
        </div>
      </TableToolbar>

      <BulkActionBar
        selectedCount={selection.selectedCount}
        itemLabel="course"
        onClear={selection.clearSelection}
      >
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => handleBulkStatus(true)}
        >
          <Power aria-hidden="true" className="size-4" />
          Activate
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => handleBulkStatus(false)}
        >
          <Power aria-hidden="true" className="size-4" />
          Deactivate
        </Button>
      </BulkActionBar>

      {/* Data table */}
      <div className="overflow-x-auto rounded-lg border">
        <Table label="Courses" className="min-w-0 md:min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  aria-label="Select all courses on this page"
                  checked={selection.allVisibleSelected}
                  indeterminate={selection.someVisibleSelected}
                  onCheckedChange={(checked) => selection.toggleAllVisible(Boolean(checked))}
                />
              </TableHead>
              <TableHead className="w-full md:w-auto">Course</TableHead>
              <TableHead className="hidden md:table-cell">Course Title</TableHead>
              <FilterableHead
                label="Scope"
                facets={facets.scope}
                className="hidden md:table-cell"
              />
              <FilterableHead
                label="Program"
                facets={facets.program}
                className="hidden md:table-cell"
              />
              <FilterableHead
                label="Major"
                facets={facets.major}
                className="hidden md:table-cell"
              />
              <FilterableHead
                label="Year Level"
                facets={facets.class.slice(0, 1)}
                className="hidden md:table-cell"
              />
              <FilterableHead
                label="Semester"
                facets={facets.class.slice(1, 2)}
                className="hidden md:table-cell"
              />
              <FilterableHead
                label="Term"
                facets={facets.class.slice(2, 3)}
                className="hidden md:table-cell"
              />
              <TableHead className="hidden text-right md:table-cell">CILOs</TableHead>
              {showEvaluationCount && (
                <TableHead className="hidden text-right md:table-cell">Evaluations</TableHead>
              )}
              <FilterableHead
                label="Status"
                facets={facets.status}
                className="hidden md:table-cell"
              />
              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCourses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showEvaluationCount ? 13 : 12}
                  className="text-muted-foreground h-24 text-center"
                >
                  {scopeFilter !== SCHEDULE_FILTER_ALL ||
                  programFilter !== SCHEDULE_FILTER_ALL ||
                  majorFilter !== SCHEDULE_FILTER_ALL ||
                  yearLevelFilter !== SCHEDULE_FILTER_ALL ||
                  semesterFilter !== SCHEDULE_FILTER_ALL ||
                  termFilter !== SCHEDULE_FILTER_ALL ||
                  searchTerm
                    ? "Clear or change the filters to see more courses."
                    : "No courses found."}
                </TableCell>
              </TableRow>
            ) : (
              // Render-only row branching is covered through the parent catalog workflow.
              // fallow-ignore-next-line complexity
              paginatedCourses.map((course) => (
                <TableRow
                  key={course.id}
                  className="group"
                  data-state={selection.selectedIds.has(course.id) ? "selected" : undefined}
                >
                  <TableCell>
                    <Checkbox
                      aria-label={`Select ${course.code}`}
                      checked={selection.selectedIds.has(course.id)}
                      onCheckedChange={(checked) =>
                        selection.toggleOne(course.id, Boolean(checked))
                      }
                    />
                  </TableCell>
                  <TableCell className="w-[99%] max-w-[200px] max-md:align-top sm:max-w-[300px] md:w-auto md:max-w-none">
                    <div className="flex flex-col gap-1">
                      <span className="text-foreground truncate font-bold">{course.code}</span>
                      <span className="text-muted-foreground line-clamp-2 text-xs break-words whitespace-normal md:hidden">
                        {course.title}
                      </span>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 md:hidden">
                        <Badge className={getCourseScopeBadgeClass(course.courseScope)}>
                          {course.courseScopeLabel}
                        </Badge>
                        <Badge variant={course.isActive ? "success" : "secondary"}>
                          {course.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 overflow-hidden text-xs md:hidden">
                        <span className="min-w-0 truncate">
                          {course.programCode ?? "No Program"}
                        </span>
                        {course.majorName && (
                          <>
                            <span className="text-border shrink-0">•</span>
                            <span className="min-w-0 truncate">{course.majorName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{course.title}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge className={getCourseScopeBadgeClass(course.courseScope)}>
                      {course.courseScopeLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {course.programCode ?? "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{course.majorName ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {getYearLevelDisplay(course.defaultYearLevel)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {course.defaultSemester ? getSemesterLabel(course.defaultSemester) : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {course.defaultTerm ? getTermLabel(course.defaultTerm) : "—"}
                  </TableCell>
                  <TableCell className="hidden text-right md:table-cell">
                    {course.ciloCount}
                  </TableCell>
                  {showEvaluationCount && (
                    <TableCell className="hidden text-right md:table-cell">
                      {course.evaluationCount}
                    </TableCell>
                  )}
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={course.isActive ? "success" : "secondary"}>
                      {course.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="text-text-muted hover:bg-surface-muted hover:text-text-primary inline-flex size-9 items-center justify-center rounded-md transition-colors"
                        aria-label={`Actions for ${course.code}`}
                      >
                        <MoreVertical className="size-4" />
                        <span className="sr-only">Actions for {course.code}</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {editInModal ? (
                          <DropdownMenuItem onClick={() => setCourseToEdit(course)}>
                            <Pencil className="text-muted-foreground" aria-hidden="true" />
                            Edit
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            render={<Link href={`${basePath}/${course.id}/edit`} />}
                          >
                            <Pencil className="text-muted-foreground" aria-hidden="true" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={isPending}
                          onClick={() => handleToggleActive(course.id, course.isActive)}
                        >
                          <Power
                            className={`size-4 shrink-0 ${course.isActive ? "text-muted-foreground" : "text-success"}`}
                            aria-hidden="true"
                          />
                          {course.isActive ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={isPending}
                          onClick={() => setCourseToDelete({ id: course.id, code: course.code })}
                        >
                          <Trash2 className="size-4 shrink-0" aria-hidden="true" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          className="justify-center"
        />
      )}

      {/* Result count */}
      <p className="text-muted-foreground text-center text-xs">
        Showing {(safePage - 1) * PAGE_SIZE + 1}–
        {Math.min(safePage * PAGE_SIZE, filteredCourses.length)} of {filteredCourses.length} course
        {filteredCourses.length !== 1 ? "s" : ""}
      </p>

      {createOpen && (
        <CourseCreateDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setCreateOpen(false);
            }
          }}
          programs={programs}
        />
      )}

      {editInModal && (
        <CourseEditDialog
          open={!!courseToEdit}
          onOpenChange={(open) => {
            if (!open) {
              setCourseToEdit(null);
            }
          }}
          course={courseToEdit}
        />
      )}

      {canImportCourses && (
        <CourseImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          config={{
            mode: "secretary",
            programs: programs.map((program) => ({
              id: program.id,
              code: program.code,
              name: program.name,
            })),
          }}
        />
      )}

      <AlertDialog open={!!courseToDelete} onOpenChange={() => setCourseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium">{courseToDelete?.code}</span>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={isPending} onClick={confirmDelete}>
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Card sub-component
// ---------------------------------------------------------------------------

function KPICard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardDescription className="text-label-sm text-muted-foreground truncate tracking-wider uppercase">
            {label}
          </CardDescription>
          {icon}
        </div>
        <CardTitle className="font-heading text-heading-xl text-foreground tabular-nums">
          {value.toLocaleString()}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
