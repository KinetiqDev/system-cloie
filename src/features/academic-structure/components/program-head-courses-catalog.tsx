"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AcademicSemester, AcademicTerm, CourseScope, YearLevel } from "@prisma/client";
import { AlertCircle, Archive, Edit, Plus, Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Pagination } from "@/components/ui/pagination";
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
import { getCourseTypeBadgeClass } from "@/features/academic-structure/lib/course-visuals";

type ProgramHeadCoursesCatalogProps = {
  program: { id: string; code: string; name: string };
  courses: ProgramHeadCourseItem[];
  summary: ProgramHeadCourseSummary;
  majors: Array<{ id: string; name: string; program_id: string }>;
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
      <span className="text-label-sm text-muted-foreground tracking-wider uppercase">{label}</span>
      <span
        className={`font-heading text-heading-xl tabular-nums ${muted ? "text-muted-foreground" : "text-foreground"}`}
      >
        {value}
      </span>
    </div>
  );
}

function MajorSelect({
  majors,
  defaultValue,
  onChange,
}: {
  majors: Array<{ id: string; name: string; program_id: string }>;
  defaultValue?: string;
  onChange: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <Select
      name="major_id"
      value={value}
      onValueChange={(v) => {
        const nextValue = v ?? "";
        setValue(nextValue);
        onChange(nextValue);
      }}
    >
      <SelectTrigger id="major_id">
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
  programId,
  majors,
  course,
  open,
  onOpenChange,
}: {
  mode: CourseFormMode;
  programId: string;
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
  const [majorId, setMajorId] = useState(course?.major_id ?? "");
  const [yearLevel, setYearLevel] = useState<YearLevel | "">(course?.default_year_level ?? "");
  const [semester, setSemester] = useState<AcademicSemester | "">(course?.default_semester ?? "");
  const [term, setTerm] = useState<AcademicTerm | "">(
    course?.default_semester === AcademicSemester.SUMMER ? "" : (course?.default_term ?? "")
  );

  const isSummer = semester === AcademicSemester.SUMMER;

  function handleSubmit(formData: FormData) {
    setError(null);

    // Set course_scope always to PROGRAM_SPECIFIC for PH
    formData.set("course_scope", CourseScope.PROGRAM_SPECIFIC);
    formData.set("programId", programId);
    formData.set("course_type", scopeType);

    // Clear major_id if program-wide
    if (scopeType === "program-wide") {
      formData.delete("major_id");
    } else if (!majorId) {
      setError("Select a major for a major-specific course.");
      return;
    } else {
      formData.set("major_id", majorId);
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
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="scope-type">Course Scope</Label>
            <input type="hidden" name="course_type" value={scopeType} />
            <Select
              value={scopeType}
              onValueChange={(v) => setScopeType(v as "program-wide" | "major-specific")}
            >
              <SelectTrigger id="scope-type">
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
              <MajorSelect
                majors={majors}
                defaultValue={course?.major_id ?? undefined}
                onChange={setMajorId}
              />
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

          <div className="border-border bg-surface-alt grid gap-4 rounded-lg border p-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="year-level">
                Year Level <span className="text-text-muted text-xs font-normal">(default)</span>
              </Label>
              <Select value={yearLevel} onValueChange={(v) => setYearLevel(v as YearLevel)}>
                <SelectTrigger id="year-level">
                  <SelectValue placeholder="Select year level">
                    {yearLevel
                      ? (YEAR_LEVEL_OPTIONS.find((o) => o.value === yearLevel)?.label ??
                        "Select year level")
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
                      ? (SEMESTER_OPTIONS.find((o) => o.value === semester)?.label ??
                        "Select semester")
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
  program,
  courses,
  summary,
  majors,
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

  const PAGE_SIZE = 15;
  const filteredCourses = filterCourses(courses, activeTab, search, majorFilter);
  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCourses = filteredCourses.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const programLabel = program.name;

  function handleToggleActive(id: string, currentActive: boolean) {
    startTransition(async () => {
      await toggleProgramHeadCourseActiveAction(program.id, id, !currentActive);
      router.refresh();
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-heading text-text-primary text-2xl font-black">Courses</h1>
          <div className="mt-2 flex items-center gap-3">
            <span className="font-heading text-link text-xl font-medium">{programLabel}</span>
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
          <Plus className="size-4" data-icon="inline-start" />
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
        {/* Tab pill selector */}
        <div className="mb-4 flex flex-wrap gap-2 px-4 pt-3 pb-2">
          {(
            [
              { value: "all", label: "All Courses" },
              { value: "program-wide", label: "Program-Wide" },
              { value: "major-specific", label: "Major-Specific" },
              { value: "gen-ed", label: "Gen Ed" },
              { value: "archived", label: "Archived" },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={activeTab === value}
              onClick={() => {
                setActiveTab(value);
                setCurrentPage(1);
              }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === value
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "border-border text-text-secondary hover:border-primary hover:text-primary bg-surface border"
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
              <Search className="text-text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
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
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-label-sm tracking-wider uppercase">Code</TableHead>
                    <TableHead className="text-label-sm tracking-wider uppercase">Title</TableHead>
                    <TableHead className="text-label-sm tracking-wider uppercase">Type</TableHead>
                    <TableHead className="text-label-sm tracking-wider uppercase">
                      Major Scope
                    </TableHead>
                    <TableHead className="text-label-sm tracking-wider uppercase">Status</TableHead>
                    <TableHead className="text-label-sm tracking-wider uppercase">
                      Last Updated
                    </TableHead>
                    <TableHead className="text-label-sm text-right tracking-wider uppercase">
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
                          <Badge
                            className={`text-xs ${getCourseTypeBadgeClass(course.course_scope, course.major_id)}`}
                          >
                            {getCourseTypeLabel(course)}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {course.major ? (
                            <Badge variant="outline" className="text-xs">
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
                            variant={course.is_active ? "success" : "secondary"}
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
                              <Button
                                variant="ghost"
                                size="icon-lg"
                                title="Edit"
                                onClick={() => setEditingCourse(course)}
                              >
                                <Edit className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-lg"
                                title={course.is_active ? "Archive" : "Restore"}
                                disabled={isPending}
                                onClick={() => handleToggleActive(course.id, course.is_active)}
                              >
                                <Archive className="size-4" />
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
              <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <CourseFormDialog
        key={`create-${createDialogKey}`}
        mode="create"
        programId={program.id}
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
          programId={program.id}
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
