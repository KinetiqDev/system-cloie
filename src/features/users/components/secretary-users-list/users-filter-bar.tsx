"use client";

import { useMemo, useState } from "react";
import { StudentSection, SystemRole, YearLevel } from "@prisma/client";
import { GraduationCap, Search, SlidersHorizontal, X } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STUDENT_SECTION_OPTIONS, YEAR_LEVEL_OPTIONS } from "@/lib/constants/academic";
import { cn } from "@/lib/utils";
import { formatRole } from "@/features/users/lib/role-visuals";
import type { SecretaryUsersActivePeriod } from "../../services/list-secretary-users-summary";
import type { SecretaryUsersListQuery } from "../../schemas/secretary-users-list";

const ALL = "__all__";

const ALL_ROLES: SystemRole[] = [
  SystemRole.SECRETARY,
  SystemRole.DEAN,
  SystemRole.PROGRAM_HEAD,
  SystemRole.GEN_ED_COORDINATOR,
  SystemRole.FACULTY,
  SystemRole.STUDENT,
  SystemRole.ALUMNI,
  SystemRole.INDUSTRY_PARTNER,
];

/**
 * The list refinements that belong to a role's records rather than to every
 * account: Student placement, Student major, and external-account
 * verification. Changing the role resets them.
 */
export type UsersSecondaryFilters = Pick<
  SecretaryUsersListQuery,
  "program" | "major" | "yearLevel" | "section" | "state" | "verification"
>;

type ProgramOption = {
  id: string;
  code: string;
  name: string;
  majors: Array<{ id: string; name: string }>;
};

interface UsersFilterBarProps {
  role: SystemRole | undefined;
  filters: UsersSecondaryFilters;
  searchTerm: string;
  activePeriod: SecretaryUsersActivePeriod | null;
  programs: ProgramOption[];
  onRoleChange: (role: SystemRole | undefined) => void;
  onFiltersChange: (next: UsersSecondaryFilters) => void;
  onSearchChange: (value: string) => void;
  onClearFilters: () => void;
}

function countActiveRefinements(filters: UsersSecondaryFilters): number {
  return [
    filters.program,
    filters.major,
    filters.yearLevel,
    filters.section,
    filters.state,
    filters.verification,
  ].filter(Boolean).length;
}

type FilterOption = {
  value: string;
  label: string;
  /** Trigger text when it should differ from the option text (long labels). */
  display?: string;
};

/**
 * A labelled list filter. The visible label names the field for sighted users;
 * the accessible name stays explicit about what the control filters.
 */
function FilterSelect({
  id,
  label,
  ariaLabel,
  value,
  allLabel,
  options,
  onChange,
  className,
}: {
  id: string;
  label: string;
  ariaLabel: string;
  value: string | undefined;
  allLabel: string;
  options: FilterOption[];
  onChange: (value: string | undefined) => void;
  className?: string;
}) {
  const selected = options.find((option) => option.value === value);

  return (
    <Field className={cn("w-full shrink-0", className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        value={value ?? ALL}
        onValueChange={(next: string | null) => onChange(!next || next === ALL ? undefined : next)}
      >
        <SelectTrigger id={id} aria-label={ariaLabel} className="w-full">
          <SelectValue>{selected ? (selected.display ?? selected.label) : allLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function SearchField({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Field className={cn("w-full shrink-0 lg:w-[18rem]", className)}>
      <FieldLabel htmlFor="users-search">Search</FieldLabel>
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          id="users-search"
          aria-label="Search users"
          placeholder="Search by name or email..."
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="pl-8"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 -translate-y-1/2 rounded-full p-2 transition-colors"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
    </Field>
  );
}

/**
 * Program, term placement, and verification — the refinements that apply
 * outside the Student academic context. Term placement is a Student record and
 * verification is an external-stakeholder record, so each one only appears for
 * the role whose accounts can carry it (and alongside All Roles).
 */
function SharedRefinementFields({
  value,
  onChange,
  role,
  programs,
  idSuffix = "",
}: {
  value: UsersSecondaryFilters;
  onChange: (next: UsersSecondaryFilters) => void;
  role: SystemRole | undefined;
  programs: ProgramOption[];
  idSuffix?: string;
}) {
  const showPlacementState = role === undefined || role === SystemRole.STUDENT;
  const showVerification =
    role === undefined || role === SystemRole.ALUMNI || role === SystemRole.INDUSTRY_PARTNER;

  return (
    <>
      <FilterSelect
        id={`users-program${idSuffix}`}
        label="Program"
        ariaLabel="Filter by program"
        className="lg:w-[12rem]"
        value={value.program}
        allLabel="All Programs"
        options={programs.map((program) => ({
          value: program.code,
          label: `${program.code} — ${program.name}`,
          display: program.code,
        }))}
        onChange={(next) =>
          // A major belongs to one program; a new program invalidates it.
          onChange({ ...value, program: next, major: undefined })
        }
      />
      {showPlacementState ? (
        <FilterSelect
          id={`users-placement${idSuffix}`}
          label="Term placement"
          ariaLabel="Filter by term placement"
          className="lg:w-[12rem]"
          value={value.state}
          allLabel="Any placement"
          options={[{ value: "awaiting-term-placement", label: "Awaiting term placement" }]}
          onChange={(next) =>
            onChange({
              ...value,
              state: next as UsersSecondaryFilters["state"],
              // Awaiting placement means there is no placement to filter.
              ...(next ? { yearLevel: undefined, section: undefined } : {}),
            })
          }
        />
      ) : null}
      {showVerification ? (
        <FilterSelect
          id={`users-verification${idSuffix}`}
          label="Verification"
          ariaLabel="Filter by verification status"
          className="lg:w-[12rem]"
          value={value.verification}
          allLabel="Any verification"
          options={[{ value: "pending", label: "Pending verification" }]}
          onChange={(next) =>
            onChange({ ...value, verification: next as UsersSecondaryFilters["verification"] })
          }
        />
      ) : null}
    </>
  );
}

/**
 * The Student academic refinements — major within the selected Program, and
 * the year level and section of the Student's placement in the active Academic
 * Period. They appear only while the list is filtered to Students, because no
 * other role carries them.
 */
// fallow-ignore-next-line complexity
function StudentFilterGroup({
  value,
  onChange,
  role,
  activePeriod,
  programs,
  idSuffix = "",
}: {
  value: UsersSecondaryFilters;
  onChange: (next: UsersSecondaryFilters) => void;
  role: SystemRole | undefined;
  activePeriod: SecretaryUsersActivePeriod | null;
  programs: ProgramOption[];
  idSuffix?: string;
}) {
  const studentContext = role === SystemRole.STUDENT;
  const selectedProgramMajors = useMemo(
    () =>
      value.program ? (programs.find((entry) => entry.code === value.program)?.majors ?? []) : [],
    [programs, value.program]
  );
  const awaitingPlacement = value.state === "awaiting-term-placement";
  const showMajor = studentContext && selectedProgramMajors.length > 0;
  const showPlacement = studentContext && activePeriod !== null && !awaitingPlacement;

  if (!studentContext) {
    return null;
  }

  const note = !activePeriod
    ? "No active Academic Period is set, so year level and section cannot be filtered."
    : awaitingPlacement
      ? "Students awaiting placement have no year level or section yet."
      : showPlacement
        ? `Year level and section come from each Student's placement in ${activePeriod.label}.`
        : null;

  return (
    <div className="border-border bg-card flex flex-col gap-3 rounded-lg border p-3">
      <h3 className="text-title-sm text-foreground flex items-center gap-2">
        <GraduationCap aria-hidden="true" className="text-muted-foreground size-4" />
        Student filters
      </h3>
      <div className="grid gap-3 lg:grid-cols-3">
        {showMajor ? (
          <FilterSelect
            id={`users-major${idSuffix}`}
            label="Major"
            ariaLabel="Filter by major"
            value={value.major}
            allLabel="All Majors"
            options={selectedProgramMajors.map((major) => ({
              value: major.name,
              label: major.name,
            }))}
            onChange={(next) => onChange({ ...value, major: next })}
          />
        ) : null}
        {showPlacement ? (
          <>
            <FilterSelect
              id={`users-year-level${idSuffix}`}
              label="Year level"
              ariaLabel="Filter by year level"
              value={value.yearLevel}
              allLabel="All Year Levels"
              options={YEAR_LEVEL_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              onChange={(next) => onChange({ ...value, yearLevel: next as YearLevel | undefined })}
            />
            <FilterSelect
              id={`users-section${idSuffix}`}
              label="Section"
              ariaLabel="Filter by section"
              value={value.section}
              allLabel="All Sections"
              options={STUDENT_SECTION_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              onChange={(next) =>
                onChange({ ...value, section: next as StudentSection | undefined })
              }
            />
          </>
        ) : null}
      </div>
      {note ? <p className="text-muted-foreground text-xs leading-normal">{note}</p> : null}
    </div>
  );
}

export function UsersFilterBar({
  role,
  filters,
  searchTerm,
  activePeriod,
  programs,
  onRoleChange,
  onFiltersChange,
  onSearchChange,
  onClearFilters,
}: UsersFilterBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The drawer edits a draft so its many controls apply in one navigation.
  const [drawerFilters, setDrawerFilters] = useState<UsersSecondaryFilters>(filters);

  const activeRefinements = countActiveRefinements(filters);
  const drawerRefinements = countActiveRefinements(drawerFilters);
  const studentContext = role === SystemRole.STUDENT;
  const hasActiveFilters = activeRefinements > 0 || searchTerm.trim().length > 0;

  return (
    <div className="flex flex-col gap-3">
      {/*
        Filters read left to right, with search at the far right of the row —
        its own utility rather than one more dropdown. The refinements that only
        apply to some roles sit beside Role; on small screens they move into the
        drawer instead of burying the list under a stack of selects.
      */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <FilterSelect
          id="users-role"
          label="Role"
          ariaLabel="Filter by role"
          className="lg:w-[12rem]"
          value={role}
          allLabel="All Roles"
          options={ALL_ROLES.map((entry) => ({ value: entry, label: formatRole(entry) }))}
          onChange={(next) => onRoleChange((next as SystemRole | undefined) ?? undefined)}
        />
        <div className="hidden lg:contents">
          <SharedRefinementFields
            value={filters}
            onChange={onFiltersChange}
            role={role}
            programs={programs}
          />
        </div>
        {hasActiveFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="hidden shrink-0 lg:inline-flex"
          >
            <X aria-hidden="true" className="size-3.5" />
            Clear all filters
          </Button>
        ) : null}
        <SearchField value={searchTerm} onChange={onSearchChange} className="lg:ml-auto" />
        <Drawer
          open={drawerOpen}
          onOpenChange={(open) => {
            setDrawerOpen(open);
            if (open) {
              setDrawerFilters(filters);
            }
          }}
          showSwipeHandle
        >
          <DrawerTrigger
            render={<Button variant="outline" className="w-full justify-between lg:hidden" />}
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal aria-hidden="true" className="size-4" />
              Filters
            </span>
            <span className="text-foreground font-normal">
              {activeRefinements > 0 ? `${activeRefinements} active` : "Optional"}
            </span>
          </DrawerTrigger>
          <DrawerContent className="max-h-[88dvh]">
            <DrawerHeader className="text-left">
              <DrawerTitle>Filter users</DrawerTitle>
              <DrawerDescription>
                Narrow the list by Program, placement, or Student details.
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-4 py-2">
              <SharedRefinementFields
                value={drawerFilters}
                onChange={setDrawerFilters}
                role={role}
                programs={programs}
                idSuffix="-mobile"
              />
              <StudentFilterGroup
                value={drawerFilters}
                onChange={setDrawerFilters}
                role={role}
                activePeriod={activePeriod}
                programs={programs}
                idSuffix="-mobile"
              />
            </div>
            <DrawerFooter className="pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              <Button
                onClick={() => {
                  onFiltersChange(drawerFilters);
                  setDrawerOpen(false);
                }}
              >
                Show results
                {drawerRefinements > 0
                  ? ` · ${drawerRefinements} filter${drawerRefinements === 1 ? "" : "s"}`
                  : ""}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDrawerFilters({});
                  onClearFilters();
                  setDrawerOpen(false);
                }}
              >
                Reset filters
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
      {studentContext ? (
        <div className="hidden lg:block">
          <StudentFilterGroup
            value={filters}
            onChange={onFiltersChange}
            role={role}
            activePeriod={activePeriod}
            programs={programs}
          />
        </div>
      ) : null}
    </div>
  );
}
