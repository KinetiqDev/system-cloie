"use client";

import { useState, useTransition } from "react";
import { Archive, Edit, FileSpreadsheet, Plus, Power, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
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
import { GenEdCourseDialog } from "./gen-ed-course-dialog";
import {
  bulkSetGenEdCoursesActiveAction,
  setGenEdCourseActiveAction,
} from "@/lib/actions/gen-ed-course-actions";
import { showToast } from "@/components/ui/toast";
import { useTableSelection } from "@/hooks/use-table-selection";
import { CourseImportDialog } from "./course-import-dialog";

import type { GenEdCourseItem, GenEdCoursesSummary } from "../services/resolve-gen-ed-courses";

type GenEdCoursesCatalogProps = {
  courses: GenEdCourseItem[];
  summary: GenEdCoursesSummary;
};

const PAGE_SIZE = 15;

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// fallow-ignore-next-line code-duplication
function filterCourses(
  courses: GenEdCourseItem[],
  statusFilter: string,
  search: string
): GenEdCourseItem[] {
  // fallow-ignore-next-line code-duplication
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

  return filtered;
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

export function GenEdCoursesCatalog({ courses, summary }: GenEdCoursesCatalogProps) {
  const [statusFilter, setStatusFilter] = useState("__all__");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<GenEdCourseItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const filteredCourses = filterCourses(courses, statusFilter, search);
  // fallow-ignore-next-line code-duplication
  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCourses = filteredCourses.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selection = useTableSelection(
    paginatedCourses.map((course) => course.id),
    `${statusFilter}:${search}:${safePage}`
  );

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
    <div>
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-text-primary text-2xl font-black">
              College-Wide General Education
            </h1>
            <Badge variant="secondary" className="bg-primary-soft text-selected-fg font-semibold">
              College-Wide
            </Badge>
          </div>
          <p className="text-body-md text-text-muted mt-2">
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

      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-3">
        {/* fallow-ignore-next-line code-duplication */}
        <StatCard label="Total Courses" value={summary.total} />
        <StatCard label="Active" value={summary.active} />
        <StatCard label="Archived" value={summary.archived} muted />
      </div>

      {/* fallow-ignore-next-line code-duplication */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
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

        {/* fallow-ignore-next-line code-duplication */}
        <div className="relative w-full md:ml-auto md:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
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
        <Table className="min-w-0 md:min-w-[760px]">
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
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden md:table-cell">Last Updated</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCourses.length === 0 ? (
              <TableRow>
                {/* fallow-ignore-next-line code-duplication */}
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  No courses found.
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
                  <TableCell className="w-[99%] max-w-[200px] align-top md:w-auto md:max-w-none">
                    <div className="flex flex-col gap-1">
                      <span className="text-foreground truncate font-bold">{course.code}</span>
                      <span className="text-muted-foreground line-clamp-2 text-xs break-words whitespace-normal md:hidden">
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
                    <Badge variant={course.is_active ? "success" : "secondary"}>
                      {course.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {/* fallow-ignore-next-line code-duplication */}
                  <TableCell className="text-muted-foreground hidden text-xs whitespace-nowrap md:table-cell">
                    {formatDate(course.updated_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`Edit ${course.code}`}
                        onClick={() => setEditingCourse(course)}
                      >
                        <Edit aria-hidden="true" className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`${course.is_active ? "Archive" : "Restore"} ${course.code}`}
                        disabled={isPending}
                        onClick={() => handleStatus(course.id, !course.is_active)}
                      >
                        <Archive aria-hidden="true" className="size-4" />
                      </Button>
                    </div>
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
