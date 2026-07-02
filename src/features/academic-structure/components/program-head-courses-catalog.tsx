"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AcademicSemester, AcademicTerm, CourseScope, YearLevel } from "@prisma/client";
import { Archive, Edit, Plus, Search, Users } from "lucide-react";
import { TermInstancePicker } from "@/features/academic-calendar/components/term-instance-picker";
import { CourseRowAssignmentsSheet } from "@/features/course-assignments/components/course-row-assignments-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { YEAR_LEVEL_OPTIONS } from "@/lib/constants/year-levels";
import { SEMESTER_OPTIONS, TERM_OPTIONS } from "@/lib/constants/academic";
import {
  createProgramHeadCourseAction,
  toggleProgramHeadCourseActiveAction,
  updateProgramHeadCourseAction,
} from "@/lib/actions/program-head-course-actions";
import type {
  ProgramHeadCourseItem,
  ProgramHeadCourseSummary,
} from "../services/resolve-program-head-courses";
import type { TermInstanceItem } from "@/features/academic-calendar/types";

type ProgramHeadCoursesCatalogProps = {
  courses: ProgramHeadCourseItem[];
  summary: ProgramHeadCourseSummary;
  programs: Array<{ id: string; code: string; name: string }>;
  majors: Array<{ id: string; name: string; program_id: string }>;
  termInstances: TermInstanceItem[];
};

type CourseFormMode = "create" | "edit";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCourseTypeLabel(course: ProgramHeadCourseItem): string {
  if (course.course_scope === CourseScope.GENERAL_EDUCATION) {
    return "General Education";
  }

  return course.major_id ? "Major-Specific" : "Program-Wide";
}

function getCourseTypeBadgeClass(course: ProgramHeadCourseItem): string {
  if (course.course_scope === CourseScope.GENERAL_EDUCATION) {
    return "bg-emerald-100 text-emerald-700";
  }
  return course.major_id ? "bg-indigo-100 text-indigo-700" : "bg-blue-100 text-blue-700";
}

function filterCourses(
  courses: ProgramHeadCourseItem[],
  tab: string,
  search: string,
  majorFilter: string
): ProgramHeadCourseItem[] {
  let filtered = courses;

  // Filter by tab
  switch (tab) {
    case "program-wide":
      filtered = filtered.filter(
        (c) => c.course_scope === CourseScope.PROGRAM_SPECIFIC && !c.major_id && c.is_active
      );
      break;
    case "major-specific":
      filtered = filtered.filter(
        (c) => c.course_scope === CourseScope.PROGRAM_SPECIFIC && c.major_id !== null && c.is_active
      );
      break;
    case "gen-ed":
      filtered = filtered.filter(
        (c) => c.course_scope === CourseScope.GENERAL_EDUCATION && c.is_active
      );
      break;
    case "archived":
      filtered = filtered.filter((c) => !c.is_active);
      break;
    default: // "all"
      filtered = filtered.filter((c) => c.is_active);
      break;
  }

  // Filter by search
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (c) => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
    );
  }

  // Filter by major
  if (majorFilter && majorFilter !== "all") {
    filtered = filtered.filter((c) => c.major_id === majorFilter);
  }

  return filtered;
}

function StatCard({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div className="border-border bg-surface hover:bg-surface-alt flex h-28 flex-col justify-between rounded-lg border p-5 transition-colors">
      <span className="text-text-muted text-xs font-semibold tracking-wider uppercase">
        {label}
      </span>
      <span
        className={`font-heading text-3xl font-bold ${muted ? "text-text-muted" : "text-text-primary"}`}
      >
        {value}
      </span>
    </div>
  );
}

function MajorSelect({
  majors,
  defaultValue,
}: {
  majors: Array<{ id: string; name: string; program_id: string }>;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <Select name="major_id" value={value} onValueChange={(v) => setValue(v ?? "")}>
      <SelectTrigger>
        <SelectValue>
          {value ? (majors.find((m) => m.id === value)?.name ?? "Select major") : "Select major"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {majors.map((major) => (
          <SelectItem key={major.id} value={major.id}>
            {major.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CourseFormDialog({
  mode,
  majors,
  course,
  open,
  onOpenChange,
}: {
  mode: CourseFormMode;
  majors: Array<{ id: string; name: string; program_id: string }>;
  course?: ProgramHeadCourseItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [scopeType, setScopeType] = useState<"program-wide" | "major-specific">(
    course?.major_id ? "major-specific" : "program-wide"
  );
  const [yearLevel, setYearLevel] = useState<YearLevel | "">(
    course?.default_year_level ?? ""
  );
  const [semester, setSemester] = useState<AcademicSemester | "">(
    course?.default_semester ?? ""
  );
  const [term, setTerm] = useState<AcademicTerm | "">(
    course?.default_semester === AcademicSemester.SUMMER
      ? ""
      : (course?.default_term ?? "")
  );

  const isSummer = semester === AcademicSemester.SUMMER;

  function handleSubmit(formData: FormData) {
    setError(null);

    // Set course_scope always to PROGRAM_SPECIFIC for PH
    formData.set("course_scope", CourseScope.PROGRAM_SPECIFIC);

    // Clear major_id if program-wide
    if (scopeType === "program-wide") {
      formData.delete("major_id");
    }

    // Append temporal fields
    formData.set("default_year_level", yearLevel);
    formData.set("default_semester", semester);
    formData.set("default_term", isSummer ? "" : term);

    startTransition(async () => {
      const action =
        mode === "create" ? createProgramHeadCourseAction : updateProgramHeadCourseAction;

      const result = await action(formData);

      if (!result.success) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add New Course" : "Edit Course"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new course within your program scope."
              : "Update course details."}
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          {mode === "edit" && course && <input type="hidden" name="id" value={course.id} />}

          {error && (
            <div className="bg-danger-soft text-danger rounded-md p-3 text-sm">{error}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="scope-type">Course Scope</Label>
            <Select
              value={scopeType}
              onValueChange={(v) => setScopeType(v as "program-wide" | "major-specific")}
            >
              <SelectTrigger>
                <SelectValue>
                  {scopeType === "program-wide" ? "Program-Wide" : "Major-Specific"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="program-wide">Program-Wide</SelectItem>
                {majors.length > 0 && (
                  <SelectItem value="major-specific">Major-Specific</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {scopeType === "major-specific" && majors.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="major_id">Major</Label>
              <MajorSelect majors={majors} defaultValue={course?.major_id ?? undefined} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="code">Course Code</Label>
            <Input
              id="code"
              name="code"
              placeholder="e.g. IT-204"
              defaultValue={course?.code ?? ""}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Course Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g. Data Structures & Algorithms"
              defaultValue={course?.title ?? ""}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Brief course description..."
              defaultValue={course?.description ?? ""}
              rows={3}
            />
          </div>

          <div className="border-border-muted bg-surface-alt grid gap-4 rounded-lg border p-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="year-level">
                Year Level <span className="text-text-muted text-xs font-normal">(default)</span>
              </Label>
              <Select value={yearLevel} onValueChange={(v) => setYearLevel(v as YearLevel)}>
                <SelectTrigger id="year-level">
                  <SelectValue placeholder="Select year level">
                    {yearLevel
                      ? (YEAR_LEVEL_OPTIONS.find((o) => o.value === yearLevel)?.label ?? "Select year level")
                      : "Select year level"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {YEAR_LEVEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="semester">
                Semester <span className="text-text-muted text-xs font-normal">(default)</span>
              </Label>
              <Select
                value={semester}
                onValueChange={(v) => {
                  const nextSemester = v as AcademicSemester;
                  setSemester(nextSemester);
                  if (nextSemester === AcademicSemester.SUMMER) {
                    setTerm("");
                  }
                }}
              >
                <SelectTrigger id="semester">
                  <SelectValue placeholder="Select semester">
                    {semester
                      ? (SEMESTER_OPTIONS.find((o) => o.value === semester)?.label ?? "Select semester")
                      : "Select semester"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {SEMESTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="term">
                Term <span className="text-text-muted text-xs font-normal">(default)</span>
              </Label>
              <Select
                value={isSummer ? "" : term}
                onValueChange={(v) => setTerm(v as AcademicTerm)}
                disabled={isSummer}
              >
                <SelectTrigger id="term">
                  <SelectValue placeholder={isSummer ? "N/A" : "Select term"}>
                    {term
                      ? (TERM_OPTIONS.find((o) => o.value === term)?.label ?? "Select term")
                      : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {!isSummer && (
                    <>
                      <SelectItem value={AcademicTerm.FIRST_TERM}>1st Term</SelectItem>
                      <SelectItem value={AcademicTerm.SECOND_TERM}>2nd Term</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              {isSummer && (
                <p className="text-muted-foreground text-xs">Summer semester has no terms</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : mode === "create" ? "Create Course" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProgramHeadCoursesCatalog({
  courses,
  summary,
  programs,
  majors,
  termInstances,
}: ProgramHeadCoursesCatalogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [majorFilter, setMajorFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogKey, setCreateDialogKey] = useState(0);
  const [editingCourse, setEditingCourse] = useState<ProgramHeadCourseItem | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);

  const PAGE_SIZE = 15;
  const filteredCourses = filterCourses(courses, activeTab, search, majorFilter);
  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCourses = filteredCourses.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const programLabel = programs.map((p) => p.name).join(", ") || "No Program";

  function handleToggleActive(id: string, currentActive: boolean) {
    startTransition(async () => {
      await toggleProgramHeadCourseActiveAction(id, !currentActive);
      router.refresh();
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-heading text-text-primary mb-2 text-4xl font-bold tracking-tight lg:text-5xl">
            Courses
          </h1>
          <div className="flex items-center gap-3">
            <span className="font-heading text-primary text-xl font-medium">{programLabel}</span>
            <span className="bg-border-strong h-1.5 w-1.5 rounded-full" />
            <span className="text-body-md text-text-muted">
              Manage courses for this program only
            </span>
          </div>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Course
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Total Courses" value={summary.total} />
        <StatCard label="Program-Wide" value={summary.programWide} />
        <StatCard label="Major-Specific" value={summary.majorSpecific} />
        <StatCard label="Gen Ed" value={summary.generalEducation} />
        <StatCard label="Archived" value={summary.archived} muted />
      </div>

      {/* Content Container */}
      <div className="bg-surface-alt rounded-xl p-2">
        {/* Header with Term Picker */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 pt-3 pb-2">
          <div className="w-64">
            <TermInstancePicker
              termInstances={termInstances}
              value={selectedTermId ?? ""}
              onChange={setSelectedTermId}
              placeholder="Select term..."
            />
          </div>
        </div>

        {/* Tab pill selector */}
        <div className="mb-4 flex flex-wrap gap-2 px-4 pt-3 pb-2">
          {([
            { value: "all", label: "All Courses" },
            { value: "program-wide", label: "Program-Wide" },
            { value: "major-specific", label: "Major-Specific" },
            { value: "gen-ed", label: "Gen Ed" },
            { value: "archived", label: "Archived" },
          ] as const).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => { setActiveTab(value); setCurrentPage(1); }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === value
                  ? "bg-primary text-white font-semibold"
                  : "border-border text-text-secondary hover:border-primary hover:text-primary border bg-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div>

          {/* Filters */}
          <div className="flex flex-col items-start justify-between gap-4 px-4 pb-4 lg:flex-row lg:items-center">
            <div className="relative w-full lg:w-80">
              <Search className="text-text-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                className="pl-9"
                placeholder="Search course code or title..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {majors.length > 0 && (
                <Select
                  value={majorFilter}
                  onValueChange={(v) => {
                    setMajorFilter(v ?? "all");
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue>
                      {majorFilter === "all"
                        ? "All Majors"
                        : (majors.find((m) => m.id === majorFilter)?.name ?? "All Majors")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Majors</SelectItem>
                    {majors.map((major) => (
                      <SelectItem key={major.id} value={major.id}>
                        {major.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Data Table */}
          <div className="border-border bg-surface overflow-hidden rounded-lg border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-medium tracking-wider uppercase">
                      Code
                    </TableHead>
                    <TableHead className="text-xs font-medium tracking-wider uppercase">
                      Title
                    </TableHead>
                    <TableHead className="text-xs font-medium tracking-wider uppercase">
                      Type
                    </TableHead>
                    <TableHead className="text-xs font-medium tracking-wider uppercase">
                      Major Scope
                    </TableHead>
                    <TableHead className="text-xs font-medium tracking-wider uppercase">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-medium tracking-wider uppercase">
                      Last Updated
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium tracking-wider uppercase">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCourses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-text-muted py-12 text-center">
                        No courses found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCourses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-heading text-text-primary text-sm font-semibold whitespace-nowrap">
                          {course.code}
                        </TableCell>
                        <TableCell className="text-text-primary text-sm">{course.title}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge className={`text-xs ${getCourseTypeBadgeClass(course)}`}>
                            {getCourseTypeLabel(course)}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {course.major ? (
                            <Badge className="bg-violet-100 text-violet-700 text-xs">
                              {course.major.name}
                            </Badge>
                          ) : course.program ? (
                            <Badge variant="outline" className="text-xs">
                              {course.program.code}
                            </Badge>
                          ) : (
                            <span className="text-text-muted text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge
                            variant={course.is_active ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {course.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-text-muted text-xs whitespace-nowrap">
                          {formatDate(course.updated_at)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {!course.isReadOnly && (
                            <div className="flex items-center justify-end gap-1">
                              <CourseRowAssignmentsSheet
                                courseId={course.id}
                                courseCode={course.code}
                                courseTitle={course.title}
                                termInstanceId={selectedTermId}
                                termInstances={termInstances}
                                availablePrograms={programs}
                                availableCourses={courses}
                                triggerRender={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Assign Faculty"
                                  >
                                    <Users className="h-4 w-4" />
                                  </Button>
                                }
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Edit"
                                onClick={() => setEditingCourse(course)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title={course.is_active ? "Archive" : "Restore"}
                                disabled={isPending}
                                onClick={() => handleToggleActive(course.id, course.is_active)}
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          {course.isReadOnly && (
                            <span className="text-text-muted text-xs">Read-only</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 px-4 py-4">
              <span className="text-text-muted text-xs">
                {(safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, filteredCourses.length)} of {filteredCourses.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                aria-label="Go to previous page"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ←
              </Button>
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
        </div>
      </div>

      {/* Create Dialog */}
      <CourseFormDialog
        key={`create-${createDialogKey}`}
        mode="create"
        majors={majors}
        open={createDialogOpen}
        onOpenChange={(open) => {
          if (open) setCreateDialogKey((k) => k + 1);
          setCreateDialogOpen(open);
        }}
      />

      {/* Edit Dialog */}
      {editingCourse && (
        <CourseFormDialog
          key={editingCourse.id}
          mode="edit"
          majors={majors}
          course={editingCourse}
          open={!!editingCourse}
          onOpenChange={(open) => {
            if (!open) setEditingCourse(null);
          }}
        />
      )}
    </div>
  );
}
