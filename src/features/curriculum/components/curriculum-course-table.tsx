"use client";

import { useMemo, useState } from "react";
import { AcademicSemester, AcademicTerm, YearLevel } from "@prisma/client";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
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
import { AlertCircle, ArrowUpDown, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  addCurriculumCourseAction,
  removeCurriculumCourseAction,
  updateCurriculumCourseAction,
} from "@/lib/actions/curriculum-actions";
import { showToast } from "@/components/ui/toast";
import {
  getSemesterLabel,
  getTermLabel,
  SEMESTER_OPTIONS,
  TERM_OPTIONS,
  YEAR_LEVEL_OPTIONS,
} from "@/lib/constants/academic";
import { getYearLevelDisplay } from "@/lib/constants/year-levels";
import type { CurriculumCourseOption, CurriculumVersionDetail } from "@/features/curriculum/types";

type SortKey = "code" | "title" | "yearLevel" | "semester" | "term";
type SortDirection = "asc" | "desc";

const SORT_RANK: Record<SortKey, (course: CurriculumVersionDetail["courses"][number]) => string> = {
  code: (course) => course.courseCodeSnapshot,
  title: (course) => course.courseTitleSnapshot,
  yearLevel: (course) => course.yearLevel,
  semester: (course) => course.semester,
  term: (course) => course.term ?? "",
};

interface CurriculumCourseTableProps {
  version: CurriculumVersionDetail | null;
  courses: CurriculumCourseOption[];
  onChanged: () => void;
}

/**
 * Sortable snapshot-based course table for a Curriculum Version. Course
 * placement rows can be added and removed only while the version is DRAFT;
 * PUBLISHED and RETIRED versions are read-only.
 */
export function CurriculumCourseTable({ version, courses, onChanged }: CurriculumCourseTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("yearLevel");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [addOpen, setAddOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<CurriculumVersionDetail["courses"][number] | null>(
    null
  );
  const [removeCourse, setRemoveCourse] = useState<
    CurriculumVersionDetail["courses"][number] | null
  >(null);
  const [isMutating, setIsMutating] = useState(false);

  const isDraft = version?.status === "DRAFT";
  const courseRows = useMemo(() => version?.courses ?? [], [version?.courses]);

  const sortedCourses = useMemo(() => {
    const rank = SORT_RANK[sortKey];
    return [...courseRows].sort((a, b) => {
      const aValue = rank(a);
      const bValue = rank(b);
      const result = aValue.localeCompare(bValue);
      return sortDirection === "asc" ? result : -result;
    });
  }, [courseRows, sortKey, sortDirection]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  function handleRemove() {
    if (!removeCourse) return;
    setIsMutating(true);
    removeCurriculumCourseAction(removeCourse.id)
      .then((result) => {
        if (result.success) {
          showToast("Course removed from curriculum", "success");
          setRemoveCourse(null);
          onChanged();
        } else {
          showToast(result.error, "error");
        }
      })
      .finally(() => setIsMutating(false));
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>{version ? `${version.code} — Courses` : "Courses"}</CardTitle>
          <CardDescription>
            {version
              ? isDraft
                ? "Draft curricula can be edited. Add or remove course placements."
                : "Published and retired curricula are immutable."
              : "Select a curriculum version to view its courses."}
          </CardDescription>
        </div>
        {version && isDraft && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add Course
          </Button>
        )}
      </CardHeader>

      {!version ? (
        <Empty>
          <EmptyTitle>No version selected</EmptyTitle>
          <EmptyDescription>
            Choose a curriculum version to see its course placements.
          </EmptyDescription>
        </Empty>
      ) : courseRows.length === 0 ? (
        <Empty>
          <EmptyTitle>No courses yet</EmptyTitle>
          <EmptyDescription>
            {isDraft
              ? "Add course placements to build this draft curriculum."
              : "This curriculum version has no recorded course placements."}
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead
                  label="Code"
                  active={sortKey === "code"}
                  direction={sortDirection}
                  onClick={() => toggleSort("code")}
                />
                <SortableHead
                  label="Title"
                  active={sortKey === "title"}
                  direction={sortDirection}
                  onClick={() => toggleSort("title")}
                />
                <SortableHead
                  label="Year Level"
                  active={sortKey === "yearLevel"}
                  direction={sortDirection}
                  onClick={() => toggleSort("yearLevel")}
                />
                <SortableHead
                  label="Semester"
                  active={sortKey === "semester"}
                  direction={sortDirection}
                  onClick={() => toggleSort("semester")}
                />
                <SortableHead
                  label="Term"
                  active={sortKey === "term"}
                  direction={sortDirection}
                  onClick={() => toggleSort("term")}
                />
                {isDraft && <TableHead className="w-12" aria-label="Actions" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCourses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">{course.courseCodeSnapshot}</TableCell>
                  <TableCell>{course.courseTitleSnapshot}</TableCell>
                  <TableCell>{getYearLevelDisplay(course.yearLevel)}</TableCell>
                  <TableCell>{getSemesterLabel(course.semester)}</TableCell>
                  <TableCell>{course.term ? getTermLabel(course.term) : "—"}</TableCell>
                  {isDraft && (
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${course.courseCodeSnapshot} placement`}
                          onClick={() => setEditCourse(course)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${course.courseCodeSnapshot}`}
                          onClick={() => setRemoveCourse(course)}
                        >
                          <Trash2 className="text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {version && isDraft && (
        <AddCourseDialog
          key={addOpen ? "open" : "closed"}
          open={addOpen}
          onOpenChange={setAddOpen}
          courses={courses.filter(
            (course) => course.programId === version.programId || course.programId === null
          )}
          curriculumVersionId={version.id}
          onChanged={onChanged}
        />
      )}

      {version && isDraft && editCourse && (
        <EditPlacementDialog
          key={editCourse.id}
          course={editCourse}
          open={!!editCourse}
          onOpenChange={(open) => !open && setEditCourse(null)}
          onChanged={onChanged}
        />
      )}

      <AlertDialog
        open={!!removeCourse}
        onOpenChange={(open) => !open && !isMutating && setRemoveCourse(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this course?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeCourse
                ? `${removeCourse.courseCodeSnapshot} — ${removeCourse.courseTitleSnapshot} will be removed from this draft curriculum.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleRemove} loading={isMutating}>
              Remove Course
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function SortableHead({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}) {
  return (
    <TableHead aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={onClick}
        className="hover:text-foreground inline-flex items-center gap-1.5 text-left font-medium"
      >
        {label}
        <ArrowUpDown className="text-muted-foreground size-3.5" />
      </button>
    </TableHead>
  );
}

interface AddCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: CurriculumCourseOption[];
  curriculumVersionId: string;
  onChanged: () => void;
}

function AddCourseDialog({
  open,
  onOpenChange,
  courses,
  curriculumVersionId,
  onChanged,
}: AddCourseDialogProps) {
  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState<string>("");
  const [yearLevel, setYearLevel] = useState<YearLevel>(YearLevel.FIRST_YEAR);
  const [semester, setSemester] = useState<AcademicSemester>(AcademicSemester.FIRST);
  const [term, setTerm] = useState<AcademicTerm | null>(AcademicTerm.FIRST_TERM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return courses;
    return courses.filter(
      (course) =>
        course.code.toLowerCase().includes(query) || course.title.toLowerCase().includes(query)
    );
  }, [courses, search]);

  const selectedCourse = courses.find((course) => course.id === courseId);

  function handleSemesterChange(value: string | null) {
    if (!value) return;
    setSemester(value as AcademicSemester);
    if (value === AcademicSemester.SUMMER) {
      setTerm(null);
    } else if (term === null) {
      setTerm(AcademicTerm.FIRST_TERM);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!courseId) {
      setError("Select a course to add");
      return;
    }
    setIsSubmitting(true);
    addCurriculumCourseAction({
      curriculumVersionId,
      courseId,
      yearLevel,
      semester,
      term: semester === AcademicSemester.SUMMER ? null : term,
    })
      .then((result) => {
        if (result.success) {
          showToast("Course added to curriculum", "success");
          setCourseId("");
          setSearch("");
          onOpenChange(false);
          onChanged();
        } else {
          setError(result.error);
        }
      })
      .finally(() => setIsSubmitting(false));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,42rem)] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Add Course</DialogTitle>
            <DialogDescription>
              Search the catalog and place a course in this draft curriculum.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Field>
              <FieldLabel htmlFor="course-search">Search Courses</FieldLabel>
              <FieldContent>
                <div className="relative">
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                  <Input
                    id="course-search"
                    placeholder="Search by code or title"
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </FieldContent>
            </Field>

            <div className="max-h-48 overflow-y-auto rounded-md border">
              {filteredCourses.length === 0 ? (
                <p className="text-muted-foreground p-3 text-sm">No matching courses.</p>
              ) : (
                <ul className="divide-y">
                  {filteredCourses.map((course) => {
                    const selected = course.id === courseId;
                    return (
                      <li key={course.id}>
                        <button
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            setCourseId(course.id);
                            setError(null);
                          }}
                          className="hover:bg-muted data-pressed:bg-muted flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
                        >
                          <span className="min-w-0">
                            <span className="font-medium">{course.code}</span>{" "}
                            <span className="text-muted-foreground">{course.title}</span>
                          </span>
                          {selected && <Badge variant="default">Selected</Badge>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field>
                <FieldLabel htmlFor="year-level">Year Level</FieldLabel>
                <FieldContent>
                  <Select
                    value={yearLevel}
                    onValueChange={(value) => setYearLevel(value as YearLevel)}
                  >
                    <SelectTrigger id="year-level" className="w-full">
                      <SelectValue>{getYearLevelDisplay(yearLevel)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {YEAR_LEVEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="semester">Semester</FieldLabel>
                <FieldContent>
                  <Select value={semester} onValueChange={handleSemesterChange}>
                    <SelectTrigger id="semester" className="w-full">
                      <SelectValue>{getSemesterLabel(semester)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {SEMESTER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="term">Term</FieldLabel>
                <FieldContent>
                  <Select
                    value={semester === AcademicSemester.SUMMER ? null : term}
                    onValueChange={(value) => setTerm(value ? (value as AcademicTerm) : null)}
                    disabled={semester === AcademicSemester.SUMMER}
                  >
                    <SelectTrigger id="term" className="w-full">
                      <SelectValue>{term ? getTermLabel(term) : "None"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {TERM_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
            </div>

            {selectedCourse && (
              <p className="text-muted-foreground text-xs">
                Snapshot will record <strong>{selectedCourse.code}</strong> — {selectedCourse.title}{" "}
                as approved.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add Course"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditPlacementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: CurriculumVersionDetail["courses"][number];
  onChanged: () => void;
}

/**
 * Dialog for editing a Course placement (year level, semester, term) within a
 * DRAFT Curriculum Version. Editing the placement never rewrites the frozen
 * course code/title snapshots.
 */
function EditPlacementDialog({ open, onOpenChange, course, onChanged }: EditPlacementDialogProps) {
  const [yearLevel, setYearLevel] = useState<YearLevel>(course.yearLevel);
  const [semester, setSemester] = useState<AcademicSemester>(course.semester);
  const [term, setTerm] = useState<AcademicTerm | null>(course.term);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSemesterChange(value: string | null) {
    if (!value) return;
    setSemester(value as AcademicSemester);
    if (value === AcademicSemester.SUMMER) {
      setTerm(null);
    } else if (term === null) {
      setTerm(AcademicTerm.FIRST_TERM);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    updateCurriculumCourseAction(course.id, {
      yearLevel,
      semester,
      term: semester === AcademicSemester.SUMMER ? null : term,
    })
      .then((result) => {
        if (result.success) {
          showToast("Course placement updated", "success");
          onOpenChange(false);
          onChanged();
        } else {
          setError(result.error);
        }
      })
      .finally(() => setIsSubmitting(false));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Edit Course Placement</DialogTitle>
            <DialogDescription>
              {course.courseCodeSnapshot} — {course.courseTitleSnapshot}. The approved course code
              and title snapshots stay unchanged.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-3 gap-3">
              <Field>
                <FieldLabel htmlFor="edit-year-level">Year Level</FieldLabel>
                <FieldContent>
                  <Select
                    value={yearLevel}
                    onValueChange={(value) => setYearLevel(value as YearLevel)}
                  >
                    <SelectTrigger id="edit-year-level" className="w-full">
                      <SelectValue>{getYearLevelDisplay(yearLevel)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {YEAR_LEVEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-semester">Semester</FieldLabel>
                <FieldContent>
                  <Select value={semester} onValueChange={handleSemesterChange}>
                    <SelectTrigger id="edit-semester" className="w-full">
                      <SelectValue>{getSemesterLabel(semester)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {SEMESTER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-term">Term</FieldLabel>
                <FieldContent>
                  <Select
                    value={semester === AcademicSemester.SUMMER ? null : term}
                    onValueChange={(value) => setTerm(value ? (value as AcademicTerm) : null)}
                    disabled={semester === AcademicSemester.SUMMER}
                  >
                    <SelectTrigger id="edit-term" className="w-full">
                      <SelectValue>{term ? getTermLabel(term) : "None"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {TERM_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save Placement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
