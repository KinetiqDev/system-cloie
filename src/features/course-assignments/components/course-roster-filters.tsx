"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CourseScope, StudentSection, YearLevel } from "@prisma/client";
import { SlidersHorizontal } from "lucide-react";

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
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectItem } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { TermInstancePicker } from "@/features/academic-calendar/components/term-instance-picker";
import type { TermInstanceItem } from "@/features/academic-calendar/types";
import {
  getSectionLabel,
  getYearLevelDisplay,
  STUDENT_SECTION_OPTIONS,
  YEAR_LEVEL_OPTIONS,
} from "@/lib/constants/academic";

import {
  ACTIVE_PERIOD_SENTINEL,
  activeCourseRosterFilterCount,
  courseRosterPeriodFromPickerValue,
  DEFAULT_COURSE_ROSTER_FILTERS,
  hasNonDefaultCourseRosterPeriod,
  serializeCourseRosterPeriod,
  type CourseRosterFilterState,
} from "../course-roster-list-state";
import type { FacultyRosterCourseOption, FacultyRosterProgramOption } from "../types";
import {
  ALL_OPTION_ID,
  FilterBarShell,
  FilterSearchField,
  FilterSelect,
  SearchableFilterSelect,
} from "./shared/filter-bar";

const courseScopeLabels: Record<CourseScope, string> = {
  [CourseScope.GENERAL_EDUCATION]: "General Education",
  [CourseScope.PROGRAM_SPECIFIC]: "Program-specific",
};

type CourseRosterDiscoveryFiltersProps = {
  filters: CourseRosterFilterState;
  termInstances: TermInstanceItem[];
  courses: FacultyRosterCourseOption[];
  programs: FacultyRosterProgramOption[];
  pending: boolean;
  onNavigate: (filters: CourseRosterFilterState) => void;
};

/**
 * The narrowing controls for My Course Rosters. The Academic Period scope is
 * the primary control because it decides which lifecycle the list reads; the
 * remaining facets narrow within it. Desktop shows every control inline and
 * narrow viewports move the facets into a Drawer that applies as one change.
 */
export function CourseRosterDiscoveryFilters({
  filters,
  termInstances,
  courses,
  programs,
  pending,
  onNavigate,
}: CourseRosterDiscoveryFiltersProps) {
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const [isFocused, setIsFocused] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerFilters, setDrawerFilters] = useState(filters);
  const [previousFilters, setPreviousFilters] = useState(filters);

  // A keystroke marks the draft as a live edit; a server-side search change
  // clears that flag so an armed debounce for the stale draft is cancelled
  // instead of re-navigated. A response echoing our own navigation is not a
  // server-driven change and keeps the live flag.
  const draftIsLive = useRef(false);
  const lastServerSearch = useRef(filters.search);
  const lastNavigatedSearch = useRef<string | null>(null);

  // Runs before the debounce effect below: when the server value changes, the
  // pending timer's cleanup already ran, and the stale draft is no longer
  // treated as a live edit.
  useEffect(() => {
    if (lastServerSearch.current === filters.search) return;
    lastServerSearch.current = filters.search;
    if (filters.search !== lastNavigatedSearch.current) {
      draftIsLive.current = false;
    }
  }, [filters.search]);

  // Server-side search changes (e.g. the Clear search link) reset the draft, but
  // never overwrite an in-progress keystroke: the sync is deferred until the
  // input loses focus, so a focused field keeps the user's text and a blur
  // always re-adopts the server value.
  if (!isFocused && searchDraft !== filters.search) {
    setSearchDraft(filters.search);
  }

  if (previousFilters !== filters) {
    setPreviousFilters(filters);
    if (drawerOpen && drawerFilters.search !== filters.search) {
      setDrawerFilters((current) => ({ ...current, search: filters.search }));
    }
  }

  const navigate = onNavigate;

  const applyFacet = useCallback(
    <K extends keyof CourseRosterFilterState>(key: K, value: CourseRosterFilterState[K]) => {
      navigate({ ...filters, [key]: value });
    },
    [filters, navigate]
  );

  // Search streams in after a quiet pause while the field has focus; the facets
  // apply immediately. Both return to page one, because a narrowed list rarely
  // keeps the old offset. Losing focus or a server-side change cancels the
  // pending timer so a stale draft is never re-navigated.
  useEffect(() => {
    if (!isFocused || !draftIsLive.current || searchDraft === filters.search) return;
    const timer = window.setTimeout(() => {
      lastNavigatedSearch.current = searchDraft;
      navigate({ ...filters, search: searchDraft });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft, filters, isFocused, navigate]);

  const activeCount = activeCourseRosterFilterCount(filters);
  const drawerCount = activeCourseRosterFilterCount(drawerFilters);
  const periodIsDefault = !hasNonDefaultCourseRosterPeriod(filters.period);
  const resetFilters = () => navigate({ ...DEFAULT_COURSE_ROSTER_FILTERS });
  const periodValue = serializeCourseRosterPeriod(filters.period) ?? ACTIVE_PERIOD_SENTINEL;

  return (
    <FilterBarShell
      title="Filter rosters"
      description="Search or combine filters to narrow your course assignments."
      activeCount={activeCount + (periodIsDefault ? 0 : 1)}
      canReset={activeCount > 0 || !periodIsDefault}
      onReset={resetFilters}
    >
      <div
        className="grid min-w-0 gap-3 md:grid-cols-[minmax(16rem,1fr)_minmax(14rem,1fr)]"
        role="search"
        aria-label="Search course rosters"
        aria-busy={pending || undefined}
      >
        <TermInstancePicker
          id="roster-period"
          termInstances={termInstances}
          value={periodValue}
          onChange={(value) => applyFacet("period", courseRosterPeriodFromPickerValue(value))}
          currentValue={ACTIVE_PERIOD_SENTINEL}
          allowAll
          allowActiveOnly
          activeOnlyLabel="Active assignments"
        />
        <FilterSearchField
          id="roster-search"
          label="Search assignments"
          placeholder="Search courses or programs…"
          type="search"
          maxLength={100}
          value={searchDraft}
          onChange={(value) => {
            setSearchDraft(value);
            draftIsLive.current = true;
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </div>
      {pending && <Spinner size="sm" label="Updating results" />}

      <div className="hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <RosterFacetControls
          filters={filters}
          onFacetChange={applyFacet}
          courses={courses}
          programs={programs}
        />
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
              {activeCount ? `${activeCount} active` : "Optional"}
            </span>
          </DrawerTrigger>
          <DrawerContent className="max-h-[88dvh]">
            <DrawerHeader className="text-left">
              <DrawerTitle>More roster filters</DrawerTitle>
              <DrawerDescription>
                Narrow by course, program, year level, section, or course scope. Changes apply when
                you show results.
              </DrawerDescription>
            </DrawerHeader>
            <div className="grid min-h-0 gap-3 overflow-y-auto px-4 py-2">
              <RosterFacetControls
                filters={drawerFilters}
                onFacetChange={(key, value) =>
                  setDrawerFilters((current) => ({ ...current, [key]: value }))
                }
                courses={courses}
                programs={programs}
                idSuffix="-mobile"
              />
            </div>
            <DrawerFooter className="pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              <Button
                onClick={() => {
                  navigate(drawerFilters);
                  setDrawerOpen(false);
                }}
              >
                Show results
                {drawerCount ? ` · ${drawerCount} filter${drawerCount === 1 ? "" : "s"}` : ""}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDrawerFilters({ ...DEFAULT_COURSE_ROSTER_FILTERS });
                  resetFilters();
                  setDrawerOpen(false);
                }}
              >
                Reset filters
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </FilterBarShell>
  );
}

type FacetUpdate = <K extends keyof CourseRosterFilterState>(
  key: K,
  value: CourseRosterFilterState[K]
) => void;

function RosterFacetControls({
  filters,
  onFacetChange,
  courses,
  programs,
  idSuffix = "",
}: {
  filters: CourseRosterFilterState;
  onFacetChange: FacetUpdate;
  courses: FacultyRosterCourseOption[];
  programs: FacultyRosterProgramOption[];
  idSuffix?: string;
}) {
  const programDisplay = filters.programId
    ? (programs.find((program) => program.id === filters.programId)?.code ?? "Selected program")
    : "All Programs";
  const yearDisplay = filters.yearLevel ? getYearLevelDisplay(filters.yearLevel) : "All Years";
  const sectionDisplay = filters.section ? getSectionLabel(filters.section) : "All Sections";

  return (
    <>
      <SearchableFilterSelect
        label="Course"
        id={`roster-course${idSuffix}`}
        value={filters.courseId}
        options={[
          { id: ALL_OPTION_ID, label: "All Courses" },
          ...courses.map((course) => ({ id: course.id, label: course.code, detail: course.title })),
        ]}
        placeholder="Search courses…"
        emptyMessage="No courses match your search."
        onChange={(value) => onFacetChange("courseId", value)}
      />
      <FilterSelect
        label="Program"
        id={`roster-program${idSuffix}`}
        value={filters.programId ?? ALL_OPTION_ID}
        displayValue={programDisplay}
        onChange={(value) => onFacetChange("programId", value === ALL_OPTION_ID ? null : value)}
      >
        <SelectItem value={ALL_OPTION_ID}>All Programs</SelectItem>
        {programs.map((program) => (
          <SelectItem key={program.id} value={program.id}>
            {program.code} — {program.name}
          </SelectItem>
        ))}
      </FilterSelect>
      <FilterSelect
        label="Year level"
        id={`roster-year-level${idSuffix}`}
        value={filters.yearLevel ?? ALL_OPTION_ID}
        displayValue={yearDisplay}
        onChange={(value) =>
          onFacetChange("yearLevel", value === ALL_OPTION_ID ? null : (value as YearLevel))
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
        id={`roster-section${idSuffix}`}
        value={filters.section ?? ALL_OPTION_ID}
        displayValue={sectionDisplay}
        onChange={(value) =>
          onFacetChange("section", value === ALL_OPTION_ID ? null : (value as StudentSection))
        }
      >
        <SelectItem value={ALL_OPTION_ID}>All Sections</SelectItem>
        {STUDENT_SECTION_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </FilterSelect>
      <RosterCourseScopeFilter
        id={`roster-scope${idSuffix}`}
        value={filters.courseScope}
        onChange={(value) => onFacetChange("courseScope", value)}
      />
    </>
  );
}

function RosterCourseScopeFilter({
  id,
  value,
  onChange,
}: {
  id: string;
  value: CourseScope | null;
  onChange: (value: CourseScope | null) => void;
}) {
  return (
    <FilterSelect
      label="Course scope"
      id={id}
      value={value ?? ALL_OPTION_ID}
      displayValue={value ? courseScopeLabels[value] : "All Scopes"}
      onChange={(next) => onChange(next === ALL_OPTION_ID ? null : (next as CourseScope))}
    >
      <SelectItem value={ALL_OPTION_ID}>All Scopes</SelectItem>
      <SelectItem value={CourseScope.GENERAL_EDUCATION}>General Education</SelectItem>
      <SelectItem value={CourseScope.PROGRAM_SPECIFIC}>Program-specific</SelectItem>
    </FilterSelect>
  );
}

type CourseRosterMemberFiltersProps = {
  initialSearch: string;
  initialRemoved: boolean;
  sortDirection: "asc" | "desc";
  assignmentId: string;
  rosterBasePath?: string;
};

export function CourseRosterMemberFilters({
  initialSearch,
  initialRemoved,
  sortDirection,
  assignmentId,
  rosterBasePath,
}: CourseRosterMemberFiltersProps) {
  const router = useRouter();
  const [searchDraft, setSearchDraft] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();
  const basePath = `${rosterBasePath ?? "/course-rosters"}/${assignmentId}`;

  const navigate = useCallback(
    (search: string) => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (initialRemoved) params.set("removed", "1");
      params.set("sort", sortDirection);
      startTransition(() => router.replace(`${basePath}?${params.toString()}`));
    },
    [basePath, router, initialRemoved, sortDirection]
  );

  // Search streams in after a quiet pause while typing. The sort direction
  // and removed scope are owned by the column header and the server-driven
  // view, so they are preserved untouched here.
  useEffect(() => {
    if (searchDraft === initialSearch) return;
    const timer = setTimeout(() => navigate(searchDraft), 300);
    return () => clearTimeout(timer);
  }, [searchDraft, initialSearch, navigate]);

  return (
    <div
      role="search"
      aria-label="Search roster members"
      aria-busy={isPending || undefined}
      className="flex flex-col gap-3"
    >
      <Field>
        <FieldLabel htmlFor="member-search">Search students</FieldLabel>
        <Input
          id="member-search"
          type="search"
          maxLength={100}
          placeholder="Search by name or email"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
        />
      </Field>
      {isPending ? <Spinner size="sm" label="Updating roster members" /> : null}
    </div>
  );
}
