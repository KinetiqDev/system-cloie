import type { DeanDeploymentEvidence } from "../services/dean-analytics";

export const deanMean = (value: number | null | undefined) =>
  value == null ? "No data" : value.toFixed(2);

export const deanRate = (value: number | null) =>
  value === null ? "No data" : `${value.toFixed(1)}%`;

/** "2025-2026 · 1st Semester · 1st Term" → "SY 25–26 · 1st Sem · 1st Term" for tight chart axes. */
export function shortPeriod(label: string): string {
  return label
    .split(" · ")
    .map((part) =>
      part
        .replace(/^20(\d\d)-20(\d\d)$/, "SY $1–$2")
        .replace(/^(\d)(st|nd|rd|th) Semester$/, "$1$2 Sem")
    )
    .join(" · ");
}

export const DEAN_SOURCE_LABELS: Record<DeanDeploymentEvidence["source"], string> = {
  COURSE: "Course students",
  GENERAL_EDUCATION: "General Education students",
  STUDENT: "Program-wide students",
  ALUMNI: "Alumni",
  INDUSTRY_PARTNER: "Industry partners",
};

export const DEAN_SOURCE_SHORT_LABELS: Record<DeanDeploymentEvidence["source"], string> = {
  COURSE: "Course",
  GENERAL_EDUCATION: "Gen. Ed.",
  STUDENT: "Program-wide",
  ALUMNI: "Alumni",
  INDUSTRY_PARTNER: "Industry",
};

export const DEAN_STAKEHOLDER_LABELS = {
  STUDENT: "Students",
  ALUMNI: "Alumni",
  INDUSTRY_PARTNER: "Industry partners",
} as const;

export const deanStatus = (status: string) =>
  status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

export const DEAN_BUCKET_SHORT_LABELS = {
  COURSE_STUDENT: "Course students",
  CENTRAL_STUDENT: "Program-wide",
  ALUMNI: "Alumni",
  INDUSTRY_PARTNER: "Industry partners",
} as const;
