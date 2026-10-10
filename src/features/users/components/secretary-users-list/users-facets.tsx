"use client";

import { useId } from "react";
import { StudentSection, SystemRole, YearLevel } from "@prisma/client";
import { SlidersHorizontal } from "lucide-react";

import { FacetField } from "@/components/data-table/facet-field";
import { facetIsApplied, facetValueLabel, type FacetDef } from "@/components/data-table/types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { STUDENT_SECTION_OPTIONS, YEAR_LEVEL_OPTIONS } from "@/lib/constants/academic";
import { formatRole } from "@/features/users/lib/role-visuals";
import type { SecretaryUsersActivePeriod } from "../../services/list-secretary-users-summary";
import type { SecretaryUsersListQuery } from "../../schemas/secretary-users-list";

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

/** The refinements the URL contract carries, minus sorting and free-text search. */
export type UsersFacetState = {
  role?: SystemRole;
  program?: string;
  major?: string;
  yearLevel?: YearLevel;
  section?: StudentSection;
  state?: "awaiting-term-placement";
  verification?: "pending";
};

export type UsersFacetKey = keyof UsersFacetState;

/** The columns that own a filter funnel in the users table. */
export type UsersFacetColumn = "role" | "program" | "major" | "placement";

export type ProgramOption = {
  id: string;
  code: string;
  name: string;
  majors: Array<{ id: string; name: string }>;
};

/**
 * The URL patch one facet change writes. Clearing is decided here, beside the
 * facet that causes it: a new Program invalidates its Majors, and awaiting
 * term placement means there is no placement left to name.
 */
export function usersFacetPatch(
  key: UsersFacetKey,
  value: string | null
): Partial<SecretaryUsersListQuery> {
  switch (key) {
    case "program":
      return { program: value ?? undefined, major: undefined };
    case "major":
      return { major: value ?? undefined };
    case "yearLevel":
      return { yearLevel: (value as YearLevel | null) ?? undefined };
    case "section":
      return { section: (value as StudentSection | null) ?? undefined };
    case "state":
      return {
        state: (value as "awaiting-term-placement" | null) ?? undefined,
        ...(value ? { yearLevel: undefined, section: undefined } : {}),
      };
    case "verification":
      return { verification: (value as "pending" | null) ?? undefined };
    case "role":
      return { role: (value as SystemRole | null) ?? undefined };
  }
}

/**
 * Every narrowing control the Secretary Users list offers, expressed once as
 * facets. The column headings, the toolbar chips and the mobile sheet all read
 * from this, so no control can drift from its siblings.
 *
 * Search is deliberately absent: it spans Name and Email, so it belongs to the
 * toolbar rather than to any one column.
 */
export function buildUsersFacets(
  state: UsersFacetState,
  update: (key: UsersFacetKey, value: string | null) => void,
  options: { programs: ProgramOption[]; activePeriod: SecretaryUsersActivePeriod | null }
): {
  byColumn: Record<UsersFacetColumn, FacetDef[]>;
  account: FacetDef[];
  all: FacetDef[];
  /** Prose naming where the placement facets read from, or why they cannot. */
  placementNote: string | null;
} {
  // Term placement is a Student record, so it is presentable for Students and
  // alongside All Roles; elsewhere the server drops it too.
  const studentContext = state.role === undefined || state.role === SystemRole.STUDENT;
  // Verification belongs to an external stakeholder's record.
  const externalContext =
    state.role === undefined ||
    state.role === SystemRole.ALUMNI ||
    state.role === SystemRole.INDUSTRY_PARTNER;
  const awaitingPlacement = state.state === "awaiting-term-placement";
  const placementContext = studentContext && !awaitingPlacement;

  const placementUnavailableReason = !placementContext
    ? studentContext
      ? "Students awaiting placement have no year level or section yet."
      : "Only Students carry a term placement."
    : options.activePeriod === null
      ? "No active Academic Period is set, so year level and section cannot be filtered."
      : undefined;
  const placementAvailable = placementUnavailableReason === undefined;
  // A column whose every facet is disabled disables its own funnel, so the
  // reason is named beside the table too: the operator still learns why the
  // placement filters cannot narrow this list.
  const placementNote = !studentContext
    ? null
    : awaitingPlacement
      ? "Students awaiting placement have no year level or section yet."
      : options.activePeriod === null
        ? "No active Academic Period is set, so year level and section cannot be filtered."
        : `Year level and section come from each Student's placement in ${options.activePeriod.label}.`;

  const role: FacetDef = {
    id: "role",
    label: "Role",
    value: state.role ?? null,
    onChange: (value) => update("role", value),
    allLabel: "All roles",
    options: ALL_ROLES.map((entry) => ({ id: entry, label: formatRole(entry) })),
  };

  const program: FacetDef = {
    id: "program",
    label: "Program",
    value: state.program ?? null,
    onChange: (value) => update("program", value),
    allLabel: "All programs",
    options: options.programs.map((entry) => ({
      id: entry.code,
      label: entry.code,
      detail: entry.name,
    })),
  };

  const selectedProgram = options.programs.find((entry) => entry.code === state.program);
  const programMajors = selectedProgram?.majors ?? [];
  const major: FacetDef = {
    id: "major",
    label: "Major",
    value: state.role === SystemRole.STUDENT ? (state.major ?? null) : null,
    onChange: (value) => update("major", value),
    allLabel: "All majors",
    disabled: state.role !== SystemRole.STUDENT || programMajors.length === 0,
    disabledReason:
      state.role !== SystemRole.STUDENT
        ? "Only Students carry a major."
        : selectedProgram
          ? "This Program has no majors."
          : "Choose a Program to narrow by its majors.",
    options: programMajors.map((entry) => ({ id: entry.name, label: entry.name })),
  };

  // The Year & Section column carries two facts, so it offers two labelled facets.
  const placement: FacetDef[] = [
    {
      id: "yearLevel",
      label: "Year level",
      value: placementAvailable ? (state.yearLevel ?? null) : null,
      onChange: (value) => update("yearLevel", value),
      allLabel: "All year levels",
      disabled: !placementAvailable,
      disabledReason: placementUnavailableReason,
      options: YEAR_LEVEL_OPTIONS.map((option) => ({ id: option.value, label: option.label })),
    },
    {
      id: "section",
      label: "Section",
      value: placementAvailable ? (state.section ?? null) : null,
      onChange: (value) => update("section", value),
      allLabel: "All sections",
      disabled: !placementAvailable,
      disabledReason: placementUnavailableReason,
      options: STUDENT_SECTION_OPTIONS.map((option) => ({
        id: option.value,
        label: option.label,
      })),
    },
  ];

  const placementState: FacetDef = {
    id: "state",
    label: "Term placement",
    value: studentContext ? (state.state ?? null) : null,
    onChange: (value) => update("state", value),
    allLabel: "Any placement",
    disabled: !studentContext,
    disabledReason: "Only Students can be awaiting term placement.",
    options: [{ id: "awaiting-term-placement", label: "Awaiting term placement" }],
  };

  const verification: FacetDef = {
    id: "verification",
    label: "Verification",
    value: externalContext ? (state.verification ?? null) : null,
    onChange: (value) => update("verification", value),
    allLabel: "Any verification",
    disabled: !externalContext,
    disabledReason: "Only alumni and industry partner accounts carry a verification.",
    options: [{ id: "pending", label: "Pending verification" }],
  };

  const byColumn: Record<UsersFacetColumn, FacetDef[]> = {
    role: [role],
    program: [program],
    major: [major],
    placement,
  };

  return {
    byColumn,
    // Term placement and verification name account records, not columns, so
    // they have no heading to hang from.
    account: [placementState, verification],
    all: [...Object.values(byColumn).flat(), placementState, verification],
    // The prose the old filter bar showed under the Student controls, kept so
    // a disabled funnel never drops the explanation it exists to carry.
    placementNote,
  };
}

/**
 * Term placement and verification describe account records the table has no
 * column for, so they keep their chips in the toolbar and open from one menu
 * beside the search field rather than from a column heading.
 */
export function UsersToolbarFacetMenu({
  facets,
  className,
}: {
  facets: FacetDef[];
  className?: string;
}) {
  const instanceId = useId();
  const active = facets.filter(facetIsApplied);
  const unavailable = facets.every((facet) => facet.disabled === true);
  const summary = active.map(facetValueLabel).join(", ");

  return (
    <Popover>
      <PopoverTrigger
        openOnHover={false}
        render={
          <Button
            type="button"
            variant="outline"
            disabled={unavailable}
            aria-label={
              unavailable
                ? "Account filters, unavailable"
                : `Account filters${active.length > 0 ? `: ${summary}` : ""}`
            }
            className={className}
          />
        }
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        Account filters
        {active.length > 0 ? (
          <span className="text-muted-foreground text-xs tabular-nums">{active.length}</span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-1 p-1.5">
        <p className="text-muted-foreground px-2 pt-1.5 pb-1 text-xs font-semibold tracking-wide uppercase">
          Account filters
        </p>
        {facets.map((facet, index) => (
          <div key={facet.id} className="flex min-w-0 flex-col">
            <p className="text-foreground px-2 pt-2 pb-1 text-xs font-semibold">{facet.label}</p>
            {facet.disabled ? (
              <p className="text-muted-foreground px-2 py-2 text-xs leading-normal">
                {facet.disabledReason ?? "Not available in this view."}
              </p>
            ) : (
              <FacetField facet={facet} idPrefix={`${instanceId}-${index}`} />
            )}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
