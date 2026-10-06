import type {
  CILOMappingManifestation,
  DeploymentStatus,
  StudentSection,
  TargetStakeholder,
  YearLevel,
} from "@prisma/client";
import { YEAR_LEVEL_OPTIONS, getYearLevelDisplay } from "@/lib/constants/year-levels";

// ---------------------------------------------------------------------------
// Response-review presentation vocabulary shared by every identified review
// owner. Program Heads and the General Education Coordinator filter the same
// evaluation rosters, so the wording, status variants, and progress phrasing
// live here instead of being re-derived per role.
// ---------------------------------------------------------------------------

/** One filter dropdown entry: a stable id plus its human label. */
export type ResponseFilterOption = { id: string; label: string };

/** One typed CILO→outcome alignment rendered on a review surface. */
type ResponseOutcomeAlignment = {
  outcomeId: string;
  outcomeCode: string;
  manifestation: CILOMappingManifestation | null;
};

/**
 * Badge text for one alignment: the outcome code plus its descriptive
 * manifestation. Manifestation never filters or weights a mean — it only
 * tells the reader how the CILO contributes (ADR 0035). A mapping with no
 * recorded manifestation is still real alignment, so it is labelled rather
 * than hidden.
 */
export function formatOutcomeAlignment(alignment: ResponseOutcomeAlignment): string {
  return alignment.manifestation
    ? `${alignment.outcomeCode} (${alignment.manifestation})`
    : `${alignment.outcomeCode} (Not classified)`;
}

export const RESPONSE_YEAR_LEVEL_OPTIONS: ResponseFilterOption[] = YEAR_LEVEL_OPTIONS.map(
  (option) => ({ id: option.value, label: option.label })
);

export const RESPONSE_SECTION_OPTIONS: ResponseFilterOption[] = [
  { id: "MORNING", label: "Morning" },
  { id: "AFTERNOON", label: "Afternoon" },
  { id: "EVENING", label: "Evening" },
];

export const RESPONSE_STAKEHOLDER_OPTIONS: ResponseFilterOption[] = [
  { id: "STUDENT", label: "Students" },
  { id: "ALUMNI", label: "Alumni" },
  { id: "INDUSTRY_PARTNER", label: "Industry partners" },
];

export const RESPONSE_STATUS_OPTIONS: ResponseFilterOption[] = [
  { id: "SCHEDULED", label: "Scheduled" },
  { id: "ACTIVE", label: "Active" },
  { id: "CLOSED", label: "Closed" },
  { id: "ARCHIVED", label: "Archived" },
];

export const RESPONSE_COMPLETION_OPTIONS: ResponseFilterOption[] = [
  { id: "zero", label: "No responses" },
  { id: "partial", label: "In progress" },
  { id: "complete", label: "Complete" },
];

function labelFor(options: ResponseFilterOption[], value: string | null | undefined): string {
  if (!value) return "—";
  return options.find((option) => option.id === value)?.label ?? value;
}

export function formatResponseYearLevel(value: YearLevel | null | undefined): string {
  return getYearLevelDisplay(value);
}

export function formatResponseSection(value: StudentSection | null | undefined): string {
  return labelFor(RESPONSE_SECTION_OPTIONS, value);
}

export function formatResponseStakeholder(value: TargetStakeholder | null | undefined): string {
  return labelFor(RESPONSE_STAKEHOLDER_OPTIONS, value);
}

export function formatResponseStatus(value: DeploymentStatus): string {
  return labelFor(RESPONSE_STATUS_OPTIONS, value);
}

export function responseStatusVariant(
  value: DeploymentStatus
): "success" | "information" | "secondary" | "outline" {
  if (value === "ACTIVE") return "success";
  if (value === "SCHEDULED") return "information";
  if (value === "CLOSED") return "secondary";
  return "outline";
}

export function formatResponseProgress(submitted: number, assigned: number): string {
  if (submitted === 0) return "No responses yet";
  return `${submitted.toLocaleString()} of ${assigned.toLocaleString()} submitted`;
}
