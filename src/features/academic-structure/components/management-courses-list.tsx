"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CourseScope } from "@prisma/client";
import { BookOpen, GraduationCap, Layers, MoreVertical, Search, Library } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  toggleCourseActiveAction,
  deleteCourseAction,
} from "@/lib/actions/management-foundation-actions";

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
// Helpers
// ---------------------------------------------------------------------------

/** Returns accessible Tailwind bg+text classes for each course scope. */
function getCourseScopeBadgeClass(scope: CourseScope): string {
  switch (scope) {
    case CourseScope.GENERAL_EDUCATION:
      return "bg-emerald-100 text-emerald-700";
    case CourseScope.PROGRAM_SPECIFIC:
    default:
      return "bg-blue-100 text-blue-700";
  }
}

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

export function ManagementCoursesList({
  courses,
  kpi,
  programs,
  basePath = "/secretary/courses",
}: ManagementCoursesListProps) {
  const showEvaluationCount = !basePath.startsWith("/dean/");
  // ---- Filter state -------------------------------------------------------
  const [scopeFilter, setScopeFilter] = useState<string>("__all__");
  const [programFilter, setProgramFilter] = useState<string>("__all__");
  const [majorFilter, setMajorFilter] = useState<string>("__all__");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [courseToDelete, setCourseToDelete] = useState<{ id: string; code: string } | null>(null);

  // ---- Derived: majors for selected program --------------------------------
  const selectedProgram = programs.find((p) => p.id === programFilter);
  const availableMajors = selectedProgram?.majors ?? [];

  // ---- Filtered courses ----------------------------------------------------
  const filteredCourses = useMemo(() => {
    let result = courses;

    // Scope filter
    if (scopeFilter === "general_education") {
      result = result.filter((c) => c.courseScope === CourseScope.GENERAL_EDUCATION);
    } else if (scopeFilter === "program_specific") {
      result = result.filter((c) => c.courseScope === CourseScope.PROGRAM_SPECIFIC);
    }

    // Program filter
    if (programFilter !== "__all__") {
      result = result.filter((c) => c.programId === programFilter);
    }

    // Major filter
    if (majorFilter !== "__all__") {
      result = result.filter((c) => c.majorId === majorFilter);
    }

    // Search by code or title
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (c) => c.code.toLowerCase().includes(term) || c.title.toLowerCase().includes(term)
      );
    }

    return result;
  }, [courses, scopeFilter, programFilter, majorFilter, searchTerm]);

  // ---- Pagination ----------------------------------------------------------
  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCourses = filteredCourses.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset to page 1 when filters change
  const handleScopeChange = (value: string | null) => {
    setScopeFilter(value ?? "__all__");
    setCurrentPage(1);
  };

  const handleProgramChange = (value: string | null) => {
    setProgramFilter(value ?? "__all__");
    setMajorFilter("__all__");
    setCurrentPage(1);
  };

  const handleMajorChange = (value: string | null) => {
    setMajorFilter(value ?? "__all__");
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // ---- Action handlers -----------------------------------------------------
  const handleToggleActive = (courseId: string, currentActive: boolean) => {
    startTransition(async () => {
      await toggleCourseActiveAction(courseId, !currentActive);
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

  // ---- Pagination helpers --------------------------------------------------
  function buildPageNumbers(): (number | "ellipsis")[] {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("ellipsis");
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  }

  // ---- Render --------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-heading-lg">Courses</h1>
        <p className="text-body-md text-text-secondary">
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
          label="Program-Specific"
          value={kpi.programSpecificCourses}
          icon={<GraduationCap className="text-muted-foreground size-5" />}
        />
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-end">
        <Button render={<Link href={`${basePath}/new`} />}>Create Course</Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:flex-wrap">
        {/* Scope filter */}
        <Select value={scopeFilter} onValueChange={handleScopeChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue>
              {scopeFilter === "__all__"
                ? "All Scopes"
                : scopeFilter === "general_education"
                  ? "General Education"
                  : "Program-Specific"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Scopes</SelectItem>
            <SelectItem value="general_education">General Education</SelectItem>
            <SelectItem value="program_specific">Program-Specific</SelectItem>
          </SelectContent>
        </Select>

        {/* Program filter */}
        <Select value={programFilter} onValueChange={handleProgramChange}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue>
              {programFilter === "__all__"
                ? "All Programs"
                : (programs.find((p) => p.id === programFilter)?.code ?? "All Programs")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Programs</SelectItem>
            {programs.map((program) => (
              <SelectItem key={program.id} value={program.id}>
                {program.code} – {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Major filter (conditional — only when selected program has majors) */}
        {availableMajors.length > 0 && (
          <Select value={majorFilter} onValueChange={handleMajorChange}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue>
                {majorFilter === "__all__"
                  ? "All Majors"
                  : (availableMajors.find((m) => m.id === majorFilter)?.name ?? "All Majors")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Majors</SelectItem>
              {availableMajors.map((major) => (
                <SelectItem key={major.id} value={major.id}>
                  {major.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Search */}
        <div className="relative w-full md:max-w-xs md:ml-auto">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by code or title..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Data table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-full md:w-auto">Course</TableHead>
            <TableHead className="hidden md:table-cell">Course Title</TableHead>
            <TableHead className="hidden md:table-cell">Scope</TableHead>
            <TableHead className="hidden md:table-cell">Program</TableHead>
            <TableHead className="hidden md:table-cell">Major</TableHead>
            <TableHead className="hidden md:table-cell text-right">CILOs</TableHead>
            {showEvaluationCount && (
              <TableHead className="hidden text-right md:table-cell">Evaluations</TableHead>
            )}
            <TableHead className="hidden md:table-cell">Status</TableHead>
            <TableHead className="w-12 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedCourses.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={showEvaluationCount ? 9 : 8}
                className="text-muted-foreground h-24 text-center"
              >
                No courses found.
              </TableCell>
            </TableRow>
          ) : (
            paginatedCourses.map((course) => (
              <TableRow key={course.id} className="group">
                <TableCell className="w-[99%] md:w-auto max-w-[200px] sm:max-w-[300px] md:max-w-none align-top">
                  <div className="flex flex-col gap-1">
                    <span className="text-foreground font-bold truncate">{course.code}</span>
                    <span className="text-muted-foreground md:hidden text-xs whitespace-normal line-clamp-2 break-words">
                      {course.title}
                    </span>
                    <div className="md:hidden mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge className={getCourseScopeBadgeClass(course.courseScope)}>
                        {course.courseScopeLabel}
                      </Badge>
                      <Badge variant={course.isActive ? "default" : "secondary"} className={!course.isActive ? "bg-amber-100 text-amber-900 hover:bg-amber-200" : ""}>
                        {course.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="md:hidden mt-0.5 text-xs text-muted-foreground flex items-center gap-1.5 overflow-hidden">
                      <span className="truncate min-w-0">{course.programCode ?? "No Program"}</span>
                      {course.majorName && (
                        <>
                          <span className="text-border shrink-0">•</span>
                          <span className="truncate min-w-0">{course.majorName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{course.title}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge className={getCourseScopeBadgeClass(course.courseScope)}>{course.courseScopeLabel}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">{course.programCode ?? "—"}</TableCell>
                <TableCell className="hidden md:table-cell">{course.majorName ?? "—"}</TableCell>
                <TableCell className="hidden md:table-cell text-right">{course.ciloCount}</TableCell>
              {showEvaluationCount && (
                <TableCell className="hidden text-right md:table-cell">
                  {course.evaluationCount}
                </TableCell>
              )}
                <TableCell className="hidden md:table-cell">
                  <Badge variant={course.isActive ? "default" : "secondary"} className={!course.isActive ? "bg-amber-100 text-amber-900 hover:bg-amber-200" : ""}>
                    {course.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="text-text-muted hover:bg-surface-muted hover:text-text-primary inline-flex size-8 items-center justify-center rounded-md transition-colors">
                      <MoreVertical className="size-4" />
                      <span className="sr-only">Actions</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem render={<Link href={`${basePath}/${course.id}/edit`} />}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={isPending}
                        onClick={() => handleToggleActive(course.id, course.isActive)}
                      >
                        {course.isActive ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={isPending}
                        onClick={() => setCourseToDelete({ id: course.id, code: course.code })}
                        className="text-destructive focus:text-destructive"
                      >
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="outline"
            size="sm"
            aria-label="Go to previous page"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            ←
          </Button>

          {buildPageNumbers().map((page, idx) =>
            page === "ellipsis" ? (
              <span key={`ellipsis-${idx}`} className="text-muted-foreground px-2 text-sm">
                …
              </span>
            ) : (
              <Button
                key={page}
                variant={page === safePage ? "default" : "outline"}
                size="sm"
                aria-label={`Go to page ${page}`}
                aria-current={page === safePage ? "page" : undefined}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            )
          )}

          <Button
            variant="outline"
            size="sm"
            aria-label="Go to next page"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            →
          </Button>
        </div>
      )}

      {/* Result count */}
      <p className="text-muted-foreground text-center text-xs">
        Showing {(safePage - 1) * PAGE_SIZE + 1}–
        {Math.min(safePage * PAGE_SIZE, filteredCourses.length)} of {filteredCourses.length} course
        {filteredCourses.length !== 1 ? "s" : ""}
      </p>

      <AlertDialog open={!!courseToDelete} onOpenChange={() => setCourseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-medium">{courseToDelete?.code}</span>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={confirmDelete}
            >
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
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs font-semibold tracking-wider uppercase">
            {label}
          </CardDescription>
          {icon}
        </div>
        <CardTitle className="text-2xl font-bold">{value.toLocaleString()}</CardTitle>
      </CardHeader>
    </Card>
  );
}
