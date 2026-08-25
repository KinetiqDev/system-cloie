"use client";

import { useEffect, useState } from "react";
import { CourseScope, YearLevel, StudentSection } from "@prisma/client";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TermInstancePicker } from "@/features/academic-calendar/components/term-instance-picker";
import { YEAR_LEVEL_OPTIONS, STUDENT_SECTION_OPTIONS } from "@/lib/constants/academic";
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
  hasActiveRosterMembers?: boolean;
  searchQuery: string;
}

interface AssignmentFiltersProps {
  filters: AssignmentFiltersState;
  onFiltersChange: (filters: AssignmentFiltersState, navigation?: "push" | "replace") => void;
  availableCourses: Array<{ id: string; code: string; title: string }>;
  availablePrograms: Array<{ id: string; code: string; name: string }>;
  availableFaculty: Array<{ id: string; name: string; email: string }>;
  termInstances: TermInstanceItem[];
  showProgramFilter?: boolean;
  hideCourseScopeFilter?: boolean;
  defaultTermInstanceId?: string | null;
}

export function AssignmentFilters({
  filters,
  onFiltersChange,
  availableCourses,
  availablePrograms,
  availableFaculty,
  termInstances,
  showProgramFilter = true,
  hideCourseScopeFilter = false,
  defaultTermInstanceId = null,
}: AssignmentFiltersProps) {
  const [searchDraft, setSearchDraft] = useState(filters.searchQuery);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerFilters, setDrawerFilters] = useState(filters);

  useEffect(() => {
    if (searchDraft === filters.searchQuery) return;
    const timeout = window.setTimeout(
      () => onFiltersChange({ ...filters, searchQuery: searchDraft }, "replace"),
      300
    );
    return () => window.clearTimeout(timeout);
  }, [filters, onFiltersChange, searchDraft]);

  const secondaryCount = [
    filters.courseId,
    filters.facultyId,
    showProgramFilter ? filters.programId : null,
    filters.yearLevel,
    filters.section,
    filters.isActive,
    hideCourseScopeFilter ? null : filters.courseScope,
    filters.hasActiveRosterMembers === false ? "empty-roster" : null,
  ].filter((value) => value !== null).length;

  const resetFilters = () => {
    const reset = {
      termInstanceId: defaultTermInstanceId,
      courseId: null,
      facultyId: null,
      programId: null,
      yearLevel: null,
      section: null,
      isActive: null,
      courseScope: null,
      hasActiveRosterMembers: undefined,
      searchQuery: "",
    } satisfies AssignmentFiltersState;
    setSearchDraft("");
    setDrawerFilters(reset);
    onFiltersChange(reset);
  };

  const updateFilter = <K extends keyof AssignmentFiltersState>(
    key: K,
    value: AssignmentFiltersState[K]
  ) => onFiltersChange({ ...filters, [key]: value });

  const secondaryControls = (
    state: AssignmentFiltersState,
    update: <K extends keyof AssignmentFiltersState>(
      key: K,
      value: AssignmentFiltersState[K]
    ) => void
  ) => (
    <>
      <FilterSelect
        label="Course"
        id="assignment-course"
        value={state.courseId ?? "all"}
        onChange={(value) => update("courseId", value === "all" ? null : value)}
      >
        <SelectItem value="all">All Courses</SelectItem>
        {availableCourses.map((course) => (
          <SelectItem key={course.id} value={course.id}>
            {course.code} — {course.title}
          </SelectItem>
        ))}
      </FilterSelect>
      <FilterSelect
        label="Faculty"
        id="assignment-faculty"
        value={state.facultyId ?? "all"}
        onChange={(value) => update("facultyId", value === "all" ? null : value)}
      >
        <SelectItem value="all">All Faculty</SelectItem>
        {availableFaculty.map((faculty) => (
          <SelectItem key={faculty.id} value={faculty.id}>
            {faculty.name}
          </SelectItem>
        ))}
      </FilterSelect>
      {showProgramFilter && (
        <FilterSelect
          label="Program"
          id="assignment-program"
          value={state.programId ?? "all"}
          onChange={(value) => update("programId", value === "all" ? null : value)}
        >
          <SelectItem value="all">All Programs</SelectItem>
          {availablePrograms.map((program) => (
            <SelectItem key={program.id} value={program.id}>
              {program.code} — {program.name}
            </SelectItem>
          ))}
        </FilterSelect>
      )}
      <FilterSelect
        label="Year level"
        id="assignment-year-level"
        value={state.yearLevel ?? "all"}
        onChange={(value) => update("yearLevel", value === "all" ? null : (value as YearLevel))}
      >
        <SelectItem value="all">All Years</SelectItem>
        {YEAR_LEVEL_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </FilterSelect>
      <FilterSelect
        label="Section"
        id="assignment-section"
        value={state.section ?? "all"}
        onChange={(value) => update("section", value === "all" ? null : (value as StudentSection))}
      >
        <SelectItem value="all">All Sections</SelectItem>
        {STUDENT_SECTION_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </FilterSelect>
      <FilterSelect
        label="Status"
        id="assignment-status"
        value={state.isActive === null ? "all" : String(state.isActive)}
        onChange={(value) => update("isActive", value === "all" ? null : value === "true")}
      >
        <SelectItem value="all">All Statuses</SelectItem>
        <SelectItem value="true">Active</SelectItem>
        <SelectItem value="false">Inactive</SelectItem>
      </FilterSelect>
      {!hideCourseScopeFilter && (
        <FilterSelect
          label="Course scope"
          id="assignment-scope"
          value={state.courseScope ?? "all"}
          onChange={(value) =>
            update("courseScope", value === "all" ? null : (value as CourseScope))
          }
        >
          <SelectItem value="all">All Scopes</SelectItem>
          <SelectItem value={CourseScope.GENERAL_EDUCATION}>General Education</SelectItem>
          <SelectItem value={CourseScope.PROGRAM_SPECIFIC}>Program-specific</SelectItem>
        </FilterSelect>
      )}
    </>
  );

  return (
    <section
      aria-labelledby="assignment-scope-title"
      className="bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="assignment-scope-title" className="text-heading-sm">
          Assignment scope
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          disabled={
            !secondaryCount &&
            !filters.searchQuery &&
            filters.termInstanceId === defaultTermInstanceId
          }
        >
          <X data-icon="inline-start" />
          Reset
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(16rem,1fr)_minmax(14rem,1fr)]">
        <TermInstancePicker
          id="assignment-term-instance"
          termInstances={termInstances}
          value={filters.termInstanceId ?? "all"}
          onChange={(value) => updateFilter("termInstanceId", value === "all" ? null : value)}
          allowAll
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="assignment-search">Search</Label>
          <Input
            id="assignment-search"
            placeholder="Search course, Faculty, or Program"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
          />
        </div>
      </div>
      <div className="hidden grid-cols-2 gap-3 md:grid lg:grid-cols-4 xl:grid-cols-7">
        {secondaryControls(filters, updateFilter)}
      </div>
      <div className="md:hidden">
        <Drawer
          open={drawerOpen}
          onOpenChange={(open) => {
            setDrawerOpen(open);
            if (open) setDrawerFilters(filters);
          }}
          showSwipeHandle
        >
          <DrawerTrigger render={<Button variant="outline" className="w-full" />}>
            <SlidersHorizontal data-icon="inline-start" />
            Filters{secondaryCount ? ` (${secondaryCount})` : ""}
          </DrawerTrigger>
          <DrawerContent className="max-h-[88dvh]">
            <DrawerHeader className="text-left">
              <DrawerTitle>Assignment filters</DrawerTitle>
              <DrawerDescription>Narrow the visible class register.</DrawerDescription>
            </DrawerHeader>
            <div className="grid min-h-0 gap-3 overflow-y-auto px-4 py-2">
              {secondaryControls(drawerFilters, (key, value) =>
                setDrawerFilters((current) => ({ ...current, [key]: value }))
              )}
            </div>
            <DrawerFooter className="pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              <Button
                onClick={() => {
                  onFiltersChange(drawerFilters);
                  setDrawerOpen(false);
                }}
              >
                Show Results
              </Button>
              <Button variant="outline" onClick={resetFilters}>
                Reset
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  id,
  value,
  onChange,
  children,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(value) => value && onChange(value)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}
