import type { DeanDeploymentEvidence } from "../services/dean-analytics";
import type { DeanAnalyticsFilters } from "../services/dean-analytics-state";

const SOURCES = {
  COURSE: "COURSE",
  PROGRAM_WIDE_STUDENT: "STUDENT",
  ALUMNI: "ALUMNI",
  INDUSTRY: "INDUSTRY_PARTNER",
} as const;

export function deanScopedParticipation(
  rows: readonly DeanDeploymentEvidence[],
  programId: string,
  filters: DeanAnalyticsFilters
) {
  let submitted = 0;
  let opportunities = 0;
  for (const row of rows) {
    if (
      row.programId !== programId ||
      row.source === "GENERAL_EDUCATION" ||
      (filters.evaluationId && row.id !== filters.evaluationId) ||
      (filters.source && row.source !== SOURCES[filters.source])
    )
      continue;
    submitted += row.submitted;
    opportunities += row.opportunities;
  }
  return {
    submitted,
    opportunities,
    rate: opportunities ? (submitted / opportunities) * 100 : null,
  };
}

/** Bounds from the canonical describeScale labels, including nonconsecutive descriptors. */
export function deanScaleDomain(
  labels: Array<string | null | undefined>,
  means: Array<number | null>
): [number, number] {
  const values = means.filter((value): value is number => value !== null);
  for (const label of labels) {
    if (!label) continue;
    for (const match of label.matchAll(
      /(-?\d+(?:\.\d+)?)–(-?\d+(?:\.\d+)?)\s*\(\d+-point\)|(\d+)-point\s*\(([^)]+)\)/g
    )) {
      if (match[1] !== undefined) values.push(Number(match[1]), Number(match[2]));
      else values.push(...match[4].split(",").map(Number));
    }
  }
  return values.length ? [Math.min(...values), Math.max(...values)] : [0, 1];
}
