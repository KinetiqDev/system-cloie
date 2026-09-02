"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { CourseScope, StudentSection, YearLevel } from "@prisma/client";
import { ListFilter, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
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

const ALL_OPTION_ID = "__all__";

type SearchableFilterOption = {
  id: string;
  label: string;
  detail?: string;
};

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

  const drawerSecondaryCount = [
    drawerFilters.courseId,
    drawerFilters.facultyId,
    showProgramFilter ? drawerFilters.programId : null,
    drawerFilters.yearLevel,
    drawerFilters.section,
    drawerFilters.isActive,
    hideCourseScopeFilter ? null : drawerFilters.courseScope,
    drawerFilters.hasActiveRosterMembers === false ? "empty-roster" : null,
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
    ) => void,
    idSuffix = ""
  ) => (
    <>
      <SearchableFilterSelect
        label="Course"
        id={`assignment-course${idSuffix}`}
        value={state.courseId}
        options={[
          { id: ALL_OPTION_ID, label: "All Courses" },
          ...availableCourses.map((course) => ({
            id: course.id,
            label: course.code,
            detail: course.title,
          })),
        ]}
        placeholder="Search courses…"
        emptyMessage="No courses match your search."
        onChange={(value) => update("courseId", value)}
      />
      <SearchableFilterSelect
        label="Faculty"
        id={`assignment-faculty${idSuffix}`}
        value={state.facultyId}
        options={[
          { id: ALL_OPTION_ID, label: "All Faculty" },
          ...availableFaculty.map((faculty) => ({
            id: faculty.id,
            label: faculty.name,
            detail: faculty.email,
          })),
        ]}
        placeholder="Search faculty…"
        emptyMessage="No faculty match your search."
        onChange={(value) => update("facultyId", value)}
      />
      {showProgramFilter && (
        <FilterSelect
          label="Program"
          id={`assignment-program${idSuffix}`}
          value={state.programId ?? ALL_OPTION_ID}
          displayValue={
            state.programId
              ? (availablePrograms.find((program) => program.id === state.programId)?.code ??
                "Selected program")
              : "All Programs"
          }
          onChange={(value) => update("programId", value === ALL_OPTION_ID ? null : value)}
        >
          <SelectItem value={ALL_OPTION_ID}>All Programs</SelectItem>
          {availablePrograms.map((program) => (
            <SelectItem key={program.id} value={program.id}>
              {program.code} — {program.name}
            </SelectItem>
          ))}
        </FilterSelect>
      )}
      <FilterSelect
        label="Year level"
        id={`assignment-year-level${idSuffix}`}
        value={state.yearLevel ?? ALL_OPTION_ID}
        displayValue={
          state.yearLevel
            ? (YEAR_LEVEL_OPTIONS.find((option) => option.value === state.yearLevel)?.label ??
              "Selected year level")
            : "All Years"
        }
        onChange={(value) =>
          update("yearLevel", value === ALL_OPTION_ID ? null : (value as YearLevel))
        }
      >
        <SelectItem value={ALL_OPTION_ID}>All Years</SelectItem>
        {YEAR_LEVEL_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </FilterSelect>
      <FilterSelect
        label="Section"
        id={`assignment-section${idSuffix}`}
        value={state.section ?? ALL_OPTION_ID}
        displayValue={
          state.section
            ? (STUDENT_SECTION_OPTIONS.find((option) => option.value === state.section)?.label ??
              "Selected section")
            : "All Sections"
        }
        onChange={(value) =>
          update("section", value === ALL_OPTION_ID ? null : (value as StudentSection))
        }
      >
        <SelectItem value={ALL_OPTION_ID}>All Sections</SelectItem>
        {STUDENT_SECTION_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </FilterSelect>
      <FilterSelect
        label="Status"
        id={`assignment-status${idSuffix}`}
        value={state.isActive === null ? ALL_OPTION_ID : String(state.isActive)}
        displayValue={
          state.isActive === null ? "All Statuses" : state.isActive ? "Active" : "Inactive"
        }
        onChange={(value) => update("isActive", value === ALL_OPTION_ID ? null : value === "true")}
      >
        <SelectItem value={ALL_OPTION_ID}>All Statuses</SelectItem>
        <SelectItem value="true">Active</SelectItem>
        <SelectItem value="false">Inactive</SelectItem>
      </FilterSelect>
      {!hideCourseScopeFilter && (
        <FilterSelect
          label="Course scope"
          id={`assignment-scope${idSuffix}`}
          value={state.courseScope ?? ALL_OPTION_ID}
          displayValue={
            state.courseScope === CourseScope.GENERAL_EDUCATION
              ? "General Education"
              : state.courseScope === CourseScope.PROGRAM_SPECIFIC
                ? "Program-specific"
                : "All Scopes"
          }
          onChange={(value) =>
            update("courseScope", value === ALL_OPTION_ID ? null : (value as CourseScope))
          }
        >
          <SelectItem value={ALL_OPTION_ID}>All Scopes</SelectItem>
          <SelectItem value={CourseScope.GENERAL_EDUCATION}>General Education</SelectItem>
          <SelectItem value={CourseScope.PROGRAM_SPECIFIC}>Program-specific</SelectItem>
        </FilterSelect>
      )}
    </>
  );

  const searchPlaceholder = showProgramFilter
    ? "Search course, faculty, or program"
    : "Search course or faculty";
  const hasActiveFilters =
    secondaryCount > 0 ||
    filters.searchQuery.length > 0 ||
    filters.termInstanceId !== defaultTermInstanceId;

  return (
    <section
      aria-labelledby="assignment-filter-title"
      className="bg-card flex min-w-0 flex-col gap-4 overflow-hidden rounded-xl border p-4 shadow-xs sm:p-5"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="bg-muted text-muted-foreground ring-border hidden size-8 shrink-0 items-center justify-center rounded-lg ring-1 sm:inline-flex"
            aria-hidden="true"
          >
            <ListFilter className="size-4" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id="assignment-filter-title" className="text-title-sm leading-tight">
              Filter assignments
            </h2>
            <p className="text-muted-foreground text-xs leading-normal break-words">
              Search or combine filters to narrow the assignment list.
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          disabled={!hasActiveFilters}
          className="shrink-0 gap-1.5"
        >
          <X className="size-3.5" aria-hidden="true" />
          Reset
        </Button>
      </div>
      <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(16rem,1fr)_minmax(14rem,1fr)]">
        <TermInstancePicker
          id="assignment-term-instance"
          termInstances={termInstances}
          value={filters.termInstanceId ?? "all"}
          onChange={(value) => updateFilter("termInstanceId", value === "all" ? null : value)}
          allowAll
        />
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="assignment-search">Search assignments</Label>
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              id="assignment-search"
              placeholder={searchPlaceholder}
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              className="pl-9"
              autoComplete="off"
            />
          </div>
        </div>
      </div>
      <div className="hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
          <DrawerTrigger
            render={<Button variant="outline" className="w-full justify-between gap-2" />}
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              More filters
            </span>
            <span className="text-muted-foreground">
              {secondaryCount ? `${secondaryCount} active` : "Optional"}
            </span>
          </DrawerTrigger>
          <DrawerContent className="max-h-[88dvh]">
            <DrawerHeader className="text-left">
              <DrawerTitle>More assignment filters</DrawerTitle>
              <DrawerDescription>
                Search courses and faculty by name, code, or email. Changes apply when you show
                results.
              </DrawerDescription>
            </DrawerHeader>
            <div className="grid min-h-0 gap-3 overflow-y-auto px-4 py-2">
              {secondaryControls(
                drawerFilters,
                (key, value) => setDrawerFilters((current) => ({ ...current, [key]: value })),
                "-mobile"
              )}
            </div>
            <DrawerFooter className="pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              <Button
                onClick={() => {
                  onFiltersChange(drawerFilters);
                  setDrawerOpen(false);
                }}
              >
                Show results
                {drawerSecondaryCount
                  ? ` · ${drawerSecondaryCount} filter${drawerSecondaryCount === 1 ? "" : "s"}`
                  : ""}
              </Button>
              <Button variant="outline" onClick={resetFilters}>
                Reset filters
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </section>
  );
}

function SearchableFilterSelect({
  label,
  id,
  value,
  options,
  placeholder,
  emptyMessage,
  onChange,
}: {
  label: string;
  id: string;
  value: string | null;
  options: SearchableFilterOption[];
  placeholder: string;
  emptyMessage: string;
  onChange: (value: string | null) => void;
}) {
  const selectedOption = value ? (options.find((option) => option.id === value) ?? null) : null;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Combobox
        value={selectedOption}
        onValueChange={(option) => {
          const nextOption = option as SearchableFilterOption | null;
          onChange(!nextOption || nextOption.id === ALL_OPTION_ID ? null : nextOption.id);
        }}
        items={options}
        filter={(option, query) => {
          if (!query) return true;
          const normalizedQuery = query.toLowerCase();
          return [option.label, option.detail]
            .filter((text): text is string => Boolean(text))
            .some((text) => text.toLowerCase().includes(normalizedQuery));
        }}
        itemToStringLabel={(option) => option?.label ?? ""}
        itemToStringValue={(option) => option.id}
        autoHighlight
      >
        <ComboboxInput
          id={id}
          className="w-full"
          placeholder={placeholder}
          showClear={Boolean(value)}
        />
        <ComboboxContent className="max-w-[calc(100vw-2rem)]">
          <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
          <ComboboxList>
            {(option) => (
              <ComboboxItem key={option.id} value={option} className="items-start py-2">
                <span className="flex min-w-0 flex-col gap-0.5 py-0.5 text-left">
                  <span className="truncate text-sm leading-snug font-medium">{option.label}</span>
                  {option.detail && (
                    <span className="text-muted-foreground truncate text-xs leading-normal">
                      {option.detail}
                    </span>
                  )}
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

function FilterSelect({
  label,
  id,
  value,
  displayValue,
  onChange,
  children,
}: {
  label: string;
  id: string;
  value: string;
  displayValue?: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(nextValue) => nextValue && onChange(nextValue)}>
        <SelectTrigger id={id} className="bg-background w-full">
          <SelectValue>{displayValue}</SelectValue>
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}
