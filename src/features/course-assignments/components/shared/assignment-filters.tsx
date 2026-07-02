"use client";

import { CourseScope, YearLevel, StudentSection } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TermInstancePicker } from "@/features/academic-calendar/components/term-instance-picker";
import { YEAR_LEVEL_OPTIONS, STUDENT_SECTION_OPTIONS } from "@/lib/constants/academic";
import { X } from "lucide-react";
import type { TermInstanceItem } from "@/features/academic-calendar/types";

export interface AssignmentFiltersState {
  termInstanceId: string | null;
  courseId: string | null;
  facultyId: string | null;
  programId: string | null;
  yearLevel: YearLevel | null;
  section: StudentSection | null;
  isActive: boolean | null;
  courseScope: CourseScope | null;
  searchQuery: string;
}

interface AssignmentFiltersProps {
  filters: AssignmentFiltersState;
  onFiltersChange: (filters: AssignmentFiltersState) => void;
  availableCourses: Array<{ id: string; code: string; title: string }>;
  availablePrograms: Array<{ id: string; code: string; name: string }>;
  availableFaculty: Array<{ id: string; firstName: string; lastName: string; email: string }>;
  termInstances: TermInstanceItem[];
}

export function AssignmentFilters({
  filters,
  onFiltersChange,
  availableCourses,
  availablePrograms,
  availableFaculty,
  termInstances,
}: AssignmentFiltersProps) {
  const hasActiveFilters =
    filters.termInstanceId ||
    filters.courseId ||
    filters.facultyId ||
    filters.programId ||
    filters.yearLevel ||
    filters.section ||
    filters.isActive !== null ||
    filters.courseScope ||
    filters.searchQuery;

  const clearFilters = () => {
    onFiltersChange({
      termInstanceId: null,
      courseId: null,
      facultyId: null,
      programId: null,
      yearLevel: null,
      section: null,
      isActive: null,
      courseScope: null,
      searchQuery: "",
    });
  };

  const getStatusLabel = (value: boolean | null) => {
    if (value === true) return "Active";
    if (value === false) return "Inactive";
    return "All Statuses";
  };

  const getScopeLabel = (value: CourseScope | null) => {
    if (value === CourseScope.GENERAL_EDUCATION) return "General Education";
    if (value === CourseScope.PROGRAM_SPECIFIC) return "Program-Specific";
    return "All Scopes";
  };

  const updateFilter = <K extends keyof AssignmentFiltersState>(
    key: K,
    value: AssignmentFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="min-w-[200px]">
        <TermInstancePicker
          termInstances={termInstances}
          value={filters.termInstanceId ?? ""}
          onChange={(value) => updateFilter("termInstanceId", value || null)}
          placeholder="Select term..."
        />
      </div>

      <div className="min-w-[180px]">
        <Select
          value={filters.courseId ?? "all"}
          onValueChange={(value) => updateFilter("courseId", value === "all" ? null : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Courses">
              {filters.courseId
                ? (() => {
                    const c = availableCourses.find((c) => c.id === filters.courseId);
                    return c ? `${c.code} — ${c.title}` : null;
                  })()
                : "All Courses"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {availableCourses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.code} — {course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[180px]">
        <Select
          value={filters.facultyId ?? "all"}
          onValueChange={(value) => updateFilter("facultyId", value === "all" ? null : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Faculty">
              {filters.facultyId
                ? (() => {
                    const f = availableFaculty.find((f) => f.id === filters.facultyId);
                    return f ? `${f.firstName} ${f.lastName}` : null;
                  })()
                : "All Faculty"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Faculty</SelectItem>
            {availableFaculty.map((faculty) => (
              <SelectItem key={faculty.id} value={faculty.id}>
                {faculty.firstName} {faculty.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[150px]">
        <Select
          value={filters.programId ?? "all"}
          onValueChange={(value) => updateFilter("programId", value === "all" ? null : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Programs">
              {filters.programId
                ? (() => {
                    const p = availablePrograms.find((p) => p.id === filters.programId);
                    return p ? `${p.code} — ${p.name}` : null;
                  })()
                : "All Programs"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {availablePrograms.map((program) => (
              <SelectItem key={program.id} value={program.id}>
                {program.code} — {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[140px]">
        <Select
          value={filters.yearLevel ?? "all"}
          onValueChange={(value) =>
            updateFilter("yearLevel", value === "all" ? null : (value as YearLevel))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All Years">
              {filters.yearLevel
                ? (YEAR_LEVEL_OPTIONS.find((o) => o.value === filters.yearLevel)?.label ?? null)
                : "All Years"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {YEAR_LEVEL_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[140px]">
        <Select
          value={filters.section ?? "all"}
          onValueChange={(value) =>
            updateFilter("section", value === "all" ? null : (value as StudentSection))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All Sections">
              {filters.section
                ? (STUDENT_SECTION_OPTIONS.find((o) => o.value === filters.section)?.label ?? null)
                : "All Sections"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {STUDENT_SECTION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[140px]">
        <Select
          value={filters.isActive === null ? "all" : String(filters.isActive)}
          onValueChange={(value) =>
            updateFilter("isActive", value === "all" ? null : value === "true")
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All Statuses">
              {getStatusLabel(filters.isActive)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[170px]">
        <Select
          value={filters.courseScope ?? "all"}
          onValueChange={(value) =>
            updateFilter(
              "courseScope",
              value === "all" ? null : (value as CourseScope)
            )
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All Scopes">{getScopeLabel(filters.courseScope)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scopes</SelectItem>
            <SelectItem value={CourseScope.GENERAL_EDUCATION}>General Education</SelectItem>
            <SelectItem value={CourseScope.PROGRAM_SPECIFIC}>Program-Specific</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[200px]">
        <Input
          placeholder="Search..."
          value={filters.searchQuery}
          onChange={(e) => updateFilter("searchQuery", e.target.value)}
        />
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
