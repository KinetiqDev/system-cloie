// fallow-ignore-file code-duplication
"use client";

import { useState, useTransition } from "react";
import { Archive, Pencil, FileSpreadsheet, MoreVertical, Plus, Power } from "lucide-react";
import { AcademicSemester } from "@prisma/client";
import { getYearLevelDisplay } from "@/lib/constants/year-levels";
import { getSemesterLabel, getTermLabel } from "@/lib/constants/academic";
import { SCHEDULE_FILTER_ALL, matchesScheduleFilters } from "./course-schedule-filters";
import { courseArchiveStatusFacet, courseScheduleFacets } from "./course-catalog-facets";
import { FilterableHead } from "@/components/data-table/filterable-head";
import { MobileFilterSheet, TableToolbar } from "@/components/data-table/table-toolbar";
import { facetIsApplied } from "@/components/data-table/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GenEdCourseDialog } from "./gen-ed-course-dialog";
import {
  bulkSetGenEdCoursesActiveAction,
  setGenEdCourseActiveAction,
} from "@/lib/actions/gen-ed-course-actions";
import { showToast } from "@/components/ui/toast";
import { useTableSelection } from "@/hooks/use-table-selection";
import { formatDate } from "@/lib/utils/date-format";
import { CourseImportDialog } from "./course-import-dialog";

import type { GenEdCourseItem, GenEdCoursesSummary } from "../services/resolve-gen-ed-courses";

type GenEdCoursesCatalogProps = {
  courses: GenEdCourseItem[];
  summary: GenEdCoursesSummary;
};

const PAGE_SIZE = 15;

// fallow-ignore-next-line code-duplication
function filterCourses(
  courses: GenEdCourseItem[],
  statusFilter: string,
  search: string,
  yearLevelFilter: string,
  semesterFilter: string,
  termFilter: string
): GenEdCourseItem[] {
  let filtered = courses;

  if (statusFilter === "active") {
    filtered = filtered.filter((c) => c.is_active);
  } else if (statusFilter === "archived") {
    filtered = filtered.filter((c) => !c.is_active);
  }

  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      // fallow-ignore-next-line code-duplication
      (c) => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
    );
  }

  return filtered.filter((c) =>
    matchesScheduleFilters(
      {
        yearLevel: c.default_year_level,
        semester: c.default_semester,
        term: c.default_term,
      },
      { yearLevel: yearLevelFilter, semester: semesterFilter, term: termFilter }
    )
  );
}

// fallow-ignore-next-line code-duplication
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
    <Card size="sm">
      <CardHeader>
        <p className="text-label-md text-muted-foreground tracking-wider uppercase">{label}</p>
        <p
          className={`text-heading-xl tabular-nums ${muted ? "text-muted-foreground" : "text-foreground"}`}
        >
          {value.toLocaleString()}
        </p>
      </CardHeader>
    </Card>
  );
}

function CourseRowActions({
  course,
  disabled,
  onEdit,
  onToggleStatus,
}: {
  course: GenEdCourseItem;
  disabled: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${course.code}`} />}
      >
        <MoreVertical className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil aria-hidden="true" className="text-muted-foreground" />
          Edit {course.code}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={disabled} onClick={onToggleStatus}>
          {course.is_active ? (
            <Archive aria-hidden="true" className="text-warning" />
          ) : (
            <Power aria-hidden="true" className="text-success" />
          )}
          {course.is_active ? "Archive course" : "Restore course"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function GenEdCoursesCatalog({ courses, summary }: GenEdCoursesCatalogProps) {
  const [statusFilter, setStatusFilter] = useState(SCHEDULE_FILTER_ALL);
  const [search, setSearch] = useState("");
  const [yearLevelFilter, setYearLevelFilter] = useState(SCHEDULE_FILTER_ALL);
  const [semesterFilter, setSemesterFilter] = useState(SCHEDULE_FILTER_ALL);
  const [termFilter, setTermFilter] = useState(SCHEDULE_FILTER_ALL);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<GenEdCourseItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const filteredCourses = filterCourses(
    courses,
    statusFilter,
    search,
    yearLevelFilter,
    semesterFilter,
    termFilter
  );
  // fallow-ignore-next-line code-duplication
  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCourses = filteredCourses.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selection = useTableSelection(
    paginatedCourses.map((course) => course.id),
    `${statusFilter}:${search}:${yearLevelFilter}:${semesterFilter}:${termFilter}:${safePage}`
  );

  const setScheduleFacet = (key: "yearLevel" | "semester" | "term", value: string | null) => {
    const next = value ?? SCHEDULE_FILTER_ALL;
    if (key === "yearLevel") setYearLevelFilter(next);
    if (key === "semester") {
      setSemesterFilter(next);
      if (next === AcademicSemester.SUMMER) setTermFilter(SCHEDULE_FILTER_ALL);
    }
    if (key === "term") setTermFilter(next);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setStatusFilter(SCHEDULE_FILTER_ALL);
    setYearLevelFilter(SCHEDULE_FILTER_ALL);
    setSemesterFilter(SCHEDULE_FILTER_ALL);
    setTermFilter(SCHEDULE_FILTER_ALL);
    setSearch("");
    setCurrentPage(1);
  };

  const scheduleFacets = courseScheduleFacets(
    { yearLevel: yearLevelFilter, semester: semesterFilter, term: termFilter },
    setScheduleFacet,
    SCHEDULE_FILTER_ALL
  );
  const facets = {
    yearLevel: [scheduleFacets.yearLevel],
    semester: [scheduleFacets.semester],
    term: [scheduleFacets.term],
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

  function handleStatus(id: string, isActive: boolean) {
    startTransition(async () => {
      const result = await setGenEdCourseActiveAction(id, isActive);
      if (!result.success) showToast(result.error, "error");
      else showToast(isActive ? "Course restored." : "Course archived.");
      if (result.success) selection.clearSelection();
    });
  }

  function handleBulkStatus(isActive: boolean) {
    startTransition(async () => {
      const result = await bulkSetGenEdCoursesActiveAction([...selection.selectedIds], isActive);
      if (result.failed.length > 0) {
        showToast(
          `${result.succeeded.length} updated; ${result.failed.length} could not be updated.`,
          "warning"
        );
      } else {
        showToast(`${result.succeeded.length} courses ${isActive ? "restored" : "archived"}.`);
      }
      selection.clearSelection();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-heading-xl text-foreground text-pretty">
              College-Wide General Education
            </h1>
            <Badge variant="outline" className="font-semibold">
              College-Wide
            </Badge>
          </div>
          <p className="text-body-sm text-muted-foreground">
            General Education courses only — college-wide catalog
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet aria-hidden="true" />
            Import CSV
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden="true" className="size-4" />
            Add Course
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {/* fallow-ignore-next-line code-duplication */}
        <StatCard label="Total Courses" value={summary.total} />
        <StatCard label="Active" value={summary.active} />
        <StatCard label="Archived" value={summary.archived} muted />
      </div>

      <TableToolbar
        search={{
          id: "gen-ed-course-search",
          label: "Search courses",
          placeholder: "Search by code or title...",
          value: search,
          onChange: (value) => {
            setSearch(value);
            setCurrentPage(1);
          },
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
          Restore
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => handleBulkStatus(false)}
        >
          <Archive aria-hidden="true" className="size-4" />
          Archive
        </Button>
      </BulkActionBar>

      <div className="overflow-x-auto rounded-lg border">
        <Table label="General Education courses" className="min-w-0 md:min-w-[760px]">
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
                label="Year Level"
                facets={facets.yearLevel}
                className="hidden md:table-cell"
              />
              <FilterableHead
                label="Semester"
                facets={facets.semester}
                className="hidden md:table-cell"
              />
              <FilterableHead label="Term" facets={facets.term} className="hidden md:table-cell" />
              <FilterableHead
                label="Status"
                facets={facets.status}
                className="hidden md:table-cell"
              />
              <TableHead className="hidden md:table-cell">Last Updated</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCourses.length === 0 ? (
              <TableRow>
                {/* fallow-ignore-next-line code-duplication */}
                <TableCell colSpan={9} className="text-muted-foreground h-24 text-center">
                  {statusFilter !== SCHEDULE_FILTER_ALL ||
                  search ||
                  yearLevelFilter !== SCHEDULE_FILTER_ALL ||
                  semesterFilter !== SCHEDULE_FILTER_ALL ||
                  termFilter !== SCHEDULE_FILTER_ALL
                    ? "Clear or change the filters to see more courses."
                    : "No courses found."}
                </TableCell>
              </TableRow>
            ) : (
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
                  <TableCell className="w-[99%] max-w-[200px] max-md:align-top md:w-auto md:max-w-none">
                    <div className="flex flex-col gap-1">
                      <span className="text-foreground truncate font-bold">{course.code}</span>
                      <span className="text-muted-foreground text-caption line-clamp-2 break-words whitespace-normal md:hidden">
                        {course.title}
                      </span>
                      <div className="mt-1 md:hidden">
                        <Badge variant={course.is_active ? "success" : "secondary"}>
                          {course.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{course.title}</TableCell>
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
                  {/* fallow-ignore-next-line code-duplication */}
                  <TableCell className="text-muted-foreground text-caption hidden whitespace-nowrap md:table-cell">
                    {formatDate(course.updated_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <CourseRowActions
                      course={course}
                      disabled={isPending}
                      onEdit={() => setEditingCourse(course)}
                      onToggleStatus={() => handleStatus(course.id, !course.is_active)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* fallow-ignore-next-line code-duplication */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 px-4 py-4">
          <span className="text-muted-foreground text-caption">
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
      <GenEdCourseDialog
        open={createOpen || !!editingCourse}
        course={editingCourse ?? undefined}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditingCourse(null);
          }
        }}
      />
      <CourseImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        config={{ mode: "general-education" }}
      />
    </div>
  );
}
