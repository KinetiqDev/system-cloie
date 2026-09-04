"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AcademicSemester, AcademicTerm, CourseScope, YearLevel } from "@prisma/client";
import { getYearLevelDisplay, YEAR_LEVEL_OPTIONS } from "@/lib/constants/year-levels";
import {
  getSemesterLabel,
  getTermLabel,
  SEMESTER_OPTIONS,
  TERM_OPTIONS,
} from "@/lib/constants/academic";
import {
  Archive,
  AlertCircle,
  BookOpen,
  Edit,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Plus,
  Power,
  Search,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  bulkToggleProgramHeadCoursesActiveAction,
  createProgramHeadCourseAction,
  toggleProgramHeadCourseActiveAction,
  updateProgramHeadCourseAction,
} from "@/lib/actions/program-head-course-actions";
import type {
  ProgramHeadCourseItem,
  ProgramHeadCourseSummary,
} from "../services/resolve-program-head-courses";
import { showToast } from "@/components/ui/toast";
import { CourseImportDialog } from "./course-import-dialog";
import { useTableSelection } from "@/hooks/use-table-selection";

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

function filterCourses(
  courses: ProgramHeadCourseItem[],
  statusFilter: string,
  search: string,
  majorFilter: string
): ProgramHeadCourseItem[] {
  let filtered = courses;

  // Filter by status
  if (statusFilter === "active") {
    filtered = filtered.filter((c) => c.is_active);
  } else if (statusFilter === "archived") {
    filtered = filtered.filter((c) => !c.is_active);
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
  icon,
  muted = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardDescription className="text-label-sm truncate tracking-wider uppercase">
            {label}
          </CardDescription>
          {icon}
        </div>
        <CardTitle
          className={`text-heading-xl tabular-nums ${muted ? "text-muted-foreground" : "text-foreground"}`}
        >
          {value.toLocaleString()}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

// Render-only branching is covered through the parent dialog workflow; keep this field group cohesive.
// fallow-ignore-next-line complexity
function CourseScheduleFields({
  yearLevel,
  semester,
  term,
  onYearLevelChange,
  onSemesterChange,
  onTermChange,
}: {
  yearLevel: YearLevel | "";
  semester: AcademicSemester | "";
  term: AcademicTerm | "";
  onYearLevelChange: (value: YearLevel | "") => void;
  onSemesterChange: (value: AcademicSemester | "") => void;
  onTermChange: (value: AcademicTerm | "") => void;
}) {
  const isSummer = semester === AcademicSemester.SUMMER;

  return (
    <div className="border-border bg-surface-alt grid gap-4 rounded-lg border p-4 md:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="year-level">
          Year Level <span className="text-text-muted text-xs font-normal">(default)</span>
        </Label>
        <Select value={yearLevel} onValueChange={(value) => onYearLevelChange(value as YearLevel)}>
          <SelectTrigger id="year-level">
            <SelectValue placeholder="Select year level">
              {yearLevel
                ? (YEAR_LEVEL_OPTIONS.find((option) => option.value === yearLevel)?.label ??
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
          onValueChange={(value) => onSemesterChange(value as AcademicSemester)}
        >
          <SelectTrigger id="semester">
            <SelectValue placeholder="Select semester">
              {semester
                ? (SEMESTER_OPTIONS.find((option) => option.value === semester)?.label ??
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
          onValueChange={(value) => onTermChange(value as AcademicTerm)}
          disabled={isSummer}
        >
          <SelectTrigger id="term">
            <SelectValue placeholder={isSummer ? "N/A" : "Select term"}>
              {term
                ? (TERM_OPTIONS.find((option) => option.value === term)?.label ?? "Select term")
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
        {isSummer && <p className="text-muted-foreground text-xs">Summer semester has no terms</p>}
      </div>
    </div>
  );
}

function CourseDialogHeader({ mode }: { mode: CourseFormMode }) {
  const isCreate = mode === "create";
  return (
    <DialogHeader>
      <DialogTitle>{isCreate ? "Add New Course" : "Edit Course"}</DialogTitle>
      <DialogDescription>
        {isCreate ? "Create a new course within your program scope." : "Update course details."}
      </DialogDescription>
    </DialogHeader>
  );
}

function CourseDialogStatus({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}

function CourseDialogFooter({
  mode,
  isPending,
  onCancel,
}: {
  mode: CourseFormMode;
  isPending: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : mode === "create" ? "Create Course" : "Save Changes"}
      </Button>
    </div>
  );
}

type CourseAction = typeof createProgramHeadCourseAction | typeof updateProgramHeadCourseAction;

function getInitialCourseFormValues(course?: ProgramHeadCourseItem): {
  majorId: string;
  yearLevel: YearLevel | "";
  semester: AcademicSemester | "";
  term: AcademicTerm | "";
} {
  if (!course) {
    return { majorId: "", yearLevel: "", semester: "", term: "" };
  }

  return {
    majorId: course.major_id ?? "",
    yearLevel: course.default_year_level ?? "",
    semester: course.default_semester ?? "",
    term: course.default_semester === AcademicSemester.SUMMER ? "" : (course.default_term ?? ""),
  };
}

function submitCourseForm({
  formData,
  programId,
  majorId,
  yearLevel,
  semester,
  term,
  action,
  startTransition,
  setError,
  onSuccess,
}: {
  formData: FormData;
  programId: string;
  majorId: string;
  yearLevel: YearLevel | "";
  semester: AcademicSemester | "";
  term: AcademicTerm | "";
  action: CourseAction;
  startTransition: (callback: () => Promise<void>) => void;
  setError: (error: string | null) => void;
  onSuccess: () => void;
}) {
  const courseType = majorId ? "major-specific" : "program-wide";

  formData.set("course_scope", CourseScope.PROGRAM_SPECIFIC);
  formData.set("programId", programId);
  formData.set("course_type", courseType);

  if (majorId) {
    formData.set("major_id", majorId);
  } else {
    formData.delete("major_id");
  }

  formData.set("default_year_level", yearLevel);
  formData.set("default_semester", semester);
  formData.set("default_term", semester === AcademicSemester.SUMMER ? "" : term);

  startTransition(async () => {
    try {
      const result = await action(formData);
      if (!result.success) {
        setError(result.error);
        showToast(result.error, "error");
        return;
      }
      onSuccess();
    } catch {
      const message = "We couldn’t save the course. Check your connection and try again.";
      setError(message);
      showToast(message, "error");
    }
  });
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
  const initialValues = getInitialCourseFormValues(course);
  const [majorId, setMajorId] = useState(initialValues.majorId);
  const [yearLevel, setYearLevel] = useState<YearLevel | "">(initialValues.yearLevel);
  const [semester, setSemester] = useState<AcademicSemester | "">(initialValues.semester);
  const [term, setTerm] = useState<AcademicTerm | "">(initialValues.term);

  function handleSubmit(formData: FormData) {
    setError(null);
    submitCourseForm({
      formData,
      programId,
      majorId,
      yearLevel,
      semester,
      term,
      action: mode === "create" ? createProgramHeadCourseAction : updateProgramHeadCourseAction,
      startTransition,
      setError,
      onSuccess: () => {
        const courseCode = String(formData.get("code"));
        onOpenChange(false);
        showToast(
          mode === "create" ? `Course ${courseCode} added.` : `Course ${courseCode} updated.`,
          "success"
        );
        router.refresh();
      },
    });
  }

  return (
    <Dialog key={open ? "open" : "closed"} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <CourseDialogHeader mode={mode} />
        <form action={handleSubmit} className="space-y-4">
          {mode === "edit" && course && <input type="hidden" name="id" value={course.id} />}
          <CourseDialogStatus error={error} />

          {majors.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="major_id">
                Major <span className="text-text-muted text-xs font-normal">(optional)</span>
              </Label>
              <Select value={majorId} onValueChange={(value) => setMajorId(value ?? "")}>
                <SelectTrigger id="major_id">
                  <SelectValue placeholder="None — Program-Wide">
                    {majorId
                      ? (majors.find((m) => m.id === majorId)?.name ?? "Select major")
                      : "None — Program-Wide"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None — Program-Wide</SelectItem>
                  {majors.map((major) => (
                    <SelectItem key={major.id} value={major.id}>
                      {major.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          <CourseScheduleFields
            yearLevel={yearLevel}
            semester={semester}
            term={term}
            onYearLevelChange={setYearLevel}
            onSemesterChange={(nextSemester) => {
              setSemester(nextSemester);
              if (nextSemester === AcademicSemester.SUMMER) setTerm("");
            }}
            onTermChange={setTerm}
          />

          <CourseDialogFooter
            mode={mode}
            isPending={isPending}
            onCancel={() => onOpenChange(false)}
          />
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
  const [statusFilter, setStatusFilter] = useState("__all__");
  const [search, setSearch] = useState("");
  const [majorFilter, setMajorFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogKey, setCreateDialogKey] = useState(0);
  const [editingCourse, setEditingCourse] = useState<ProgramHeadCourseItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [statusChange, setStatusChange] = useState<{
    courses: Array<{ id: string; code: string }>;
    makeActive: boolean;
  } | null>(null);

  const PAGE_SIZE = 15;
  const filteredCourses = filterCourses(courses, statusFilter, search, majorFilter);
  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCourses = filteredCourses.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selection = useTableSelection(
    paginatedCourses.map((course) => course.id),
    `${program.id}:${statusFilter}:${search}:${majorFilter}:${safePage}`
  );
  const programLabel = program.name;

  function requestSingleStatusChange(course: ProgramHeadCourseItem) {
    setStatusChange({
      courses: [{ id: course.id, code: course.code }],
      makeActive: !course.is_active,
    });
  }

  function requestBulkStatusChange(makeActive: boolean) {
    const selectedCourses = paginatedCourses
      .filter((course) => selection.selectedIds.has(course.id))
      .map((course) => ({ id: course.id, code: course.code }));
    setStatusChange({ courses: selectedCourses, makeActive });
  }

  function confirmStatusChange() {
    if (!statusChange) return;
    const requestedChange = statusChange;
    setStatusChange(null);
    startTransition(async () => {
      try {
        if (requestedChange.courses.length === 1) {
          const course = requestedChange.courses[0];
          const result = await toggleProgramHeadCourseActiveAction(
            program.id,
            course.id,
            requestedChange.makeActive
          );
          if (!result.success) {
            showToast(result.error, "error");
            return;
          }
          showToast(
            `Course ${course.code} ${requestedChange.makeActive ? "restored" : "archived"}.`,
            "success"
          );
        } else {
          const result = await bulkToggleProgramHeadCoursesActiveAction(
            program.id,
            requestedChange.courses.map((course) => course.id),
            requestedChange.makeActive
          );
          if (result.failed.length > 0) {
            showToast(
              `${result.succeeded.length} ${result.succeeded.length === 1 ? "course was" : "courses were"} updated. ${result.failed.length} could not be updated. Try again.`,
              "warning"
            );
          } else {
            showToast(
              `${result.succeeded.length} ${result.succeeded.length === 1 ? "course" : "courses"} ${requestedChange.makeActive ? "restored" : "archived"}.`,
              "success"
            );
          }
        }
        selection.clearSelection();
        router.refresh();
      } catch {
        showToast(
          `We couldn’t ${requestedChange.makeActive ? "restore" : "archive"} the ${requestedChange.courses.length === 1 ? "course" : "courses"}. Check your connection and try again.`,
          "error"
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-heading-lg">Courses</h1>
          <p className="text-body-md text-text-secondary">
            Manage program-wide and major-specific courses for <span>{programLabel}</span>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet aria-hidden="true" className="size-4" />
            Import CSV
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus aria-hidden="true" className="size-4" />
            Add Course
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Active Courses"
          value={summary.total}
          icon={<BookOpen aria-hidden="true" className="text-muted-foreground size-5" />}
        />
        <StatCard
          label="Program-Wide"
          value={summary.programWide}
          icon={<Layers aria-hidden="true" className="text-muted-foreground size-5" />}
        />
        <StatCard
          label="Major-Specific"
          value={summary.majorSpecific}
          icon={<GraduationCap aria-hidden="true" className="text-muted-foreground size-5" />}
        />
        <StatCard
          label="Archived"
          value={summary.archived}
          icon={<Archive aria-hidden="true" className="text-muted-foreground size-5" />}
          muted
        />
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v ?? "__all__");
            setCurrentPage(1);
          }}
        >
          <SelectTrigger aria-label="Filter by course status" className="w-full md:w-[160px]">
            <SelectValue>
              {statusFilter === "__all__"
                ? "All Statuses"
                : statusFilter === "active"
                  ? "Active"
                  : "Archived"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        {/* Major filter */}
        {majors.length > 0 && (
          <Select
            value={majorFilter}
            onValueChange={(v) => {
              setMajorFilter(v ?? "all");
              setCurrentPage(1);
            }}
          >
            <SelectTrigger aria-label="Filter by major" className="w-full md:w-[180px]">
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

        {/* Search */}
        <div className="relative w-full md:ml-auto md:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            aria-label="Search courses"
            className="pl-8"
            placeholder="Search by code or title..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <BulkActionBar
        selectedCount={selection.selectedCount}
        itemLabel="course"
        onClear={selection.clearSelection}
      >
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => requestBulkStatusChange(true)}
        >
          <Power aria-hidden="true" className="size-4" />
          Restore
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => requestBulkStatusChange(false)}
        >
          <Archive aria-hidden="true" className="size-4" />
          Archive
        </Button>
      </BulkActionBar>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-lg border">
        <Table className="min-w-0 md:min-w-[900px]">
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
              {majors.length > 0 && <TableHead className="hidden md:table-cell">Major</TableHead>}
              <TableHead className="hidden md:table-cell">Year Level</TableHead>
              <TableHead className="hidden md:table-cell">Semester</TableHead>
              <TableHead className="hidden md:table-cell">Term</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden md:table-cell">Last Updated</TableHead>
              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCourses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center">
                  <p className="font-medium">No courses found</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {search || statusFilter !== "__all__" || majorFilter !== "all"
                      ? "Clear or change the filters to see more courses."
                      : "Add a course or import a CSV file to build this program’s catalog."}
                  </p>
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
                  <TableCell className="w-[99%] max-w-[200px] align-top md:w-auto md:max-w-none">
                    <div className="flex flex-col gap-1">
                      <span className="text-foreground truncate font-bold">{course.code}</span>
                      <span className="text-muted-foreground line-clamp-2 text-xs break-words whitespace-normal md:hidden">
                        {course.title}
                      </span>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 md:hidden">
                        <Badge variant={course.is_active ? "success" : "secondary"}>
                          {course.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {course.major && (
                          <span className="text-muted-foreground text-xs">{course.major.name}</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{course.title}</TableCell>
                  {majors.length > 0 && (
                    <TableCell className="hidden md:table-cell">
                      {course.major?.name ?? "—"}
                    </TableCell>
                  )}
                  <TableCell className="hidden md:table-cell">
                    {getYearLevelDisplay(course.default_year_level)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {course.default_semester ? getSemesterLabel(course.default_semester) : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {course.default_term ? getTermLabel(course.default_term) : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={course.is_active ? "success" : "secondary"}>
                      {course.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-xs whitespace-nowrap md:table-cell">
                    {formatDate(course.updated_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`Edit ${course.code}`}
                        title={`Edit ${course.code}`}
                        onClick={() => setEditingCourse(course)}
                      >
                        <Edit aria-hidden="true" className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`${course.is_active ? "Archive" : "Restore"} ${course.code}`}
                        title={`${course.is_active ? "Archive" : "Restore"} ${course.code}`}
                        disabled={isPending}
                        onClick={() => requestSingleStatusChange(course)}
                      >
                        {course.is_active ? (
                          <Archive aria-hidden="true" className="size-4" />
                        ) : (
                          <Power aria-hidden="true" className="size-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 px-4 py-4">
          <span className="text-text-muted text-xs">
            {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filteredCourses.length)} of {filteredCourses.length}
          </span>
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
      {/* Create Dialog */}
      <CourseImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        config={{
          mode: "program-head",
          selectedProgram: program,
          majors: majors.map((major) => ({
            id: major.id,
            code: major.name,
            name: major.name,
          })),
        }}
      />
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
      <AlertDialog
        open={statusChange !== null}
        onOpenChange={(open) => !open && setStatusChange(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusChange?.makeActive ? "Restore" : "Archive"}{" "}
              {statusChange?.courses.length === 1 ? "course?" : "selected courses?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusChange?.courses.length === 1 ? (
                <>
                  {statusChange.makeActive
                    ? `Restore ${statusChange.courses[0]?.code} so it can be used again?`
                    : `Archive ${statusChange.courses[0]?.code}? It will remain in the catalog and can be restored later.`}
                </>
              ) : (
                <>
                  {statusChange?.makeActive ? "Restore" : "Archive"} {statusChange?.courses.length}{" "}
                  selected courses
                  {statusChange?.makeActive
                    ? " so they can be used again?"
                    : "? They will remain in the catalog and can be restored later."}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={statusChange?.makeActive ? "default" : "destructive"}
              disabled={isPending}
              onClick={confirmStatusChange}
            >
              {statusChange?.makeActive ? "Restore" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
