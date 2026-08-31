import type {
  DeploymentStatus,
  StudentSection,
  TargetStakeholder,
  YearLevel,
} from "@prisma/client";

export type ResponseFilterOption = { id: string; label: string };

export const RESPONSE_YEAR_LEVEL_OPTIONS: ResponseFilterOption[] = [
  { id: "FIRST_YEAR", label: "First year" },
  { id: "SECOND_YEAR", label: "Second year" },
  { id: "THIRD_YEAR", label: "Third year" },
  { id: "FOURTH_YEAR", label: "Fourth year" },
];

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
  return labelFor(RESPONSE_YEAR_LEVEL_OPTIONS, value);
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
