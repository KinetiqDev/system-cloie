import { TargetStakeholder } from "@prisma/client";
import type { ParticipationSummary, StakeholderParticipation } from "./types";

// ---------------------------------------------------------------------------
// Participation aggregation (spec §35, §5.12, §13.2–§13.3)
// ---------------------------------------------------------------------------

/**
 * Narrow structural row for participation aggregation. The service's Prisma
 * select output must structurally match this shape: one row per in-scope
 * EvaluationAssignment with its response status, or null when not started.
 */
export type ParticipationRow = {
  respondentId: string;
  stakeholder: TargetStakeholder;
  responseStatus: "IN_PROGRESS" | "SUBMITTED" | null;
};

const STAKEHOLDER_ORDER: TargetStakeholder[] = [
  TargetStakeholder.STUDENT,
  TargetStakeholder.ALUMNI,
  TargetStakeholder.INDUSTRY_PARTNER,
];

interface ParticipationCounts {
  assigned: number;
  submitted: number;
  inProgress: number;
  notStarted: number;
}

function emptyCounts(): ParticipationCounts {
  return { assigned: 0, submitted: 0, inProgress: 0, notStarted: 0 };
}

function accumulate(counts: ParticipationCounts, row: ParticipationRow): void {
  counts.assigned += 1;
  if (row.responseStatus === "SUBMITTED") {
    counts.submitted += 1;
  } else if (row.responseStatus === "IN_PROGRESS") {
    counts.inProgress += 1;
  } else {
    counts.notStarted += 1;
  }
}

/** Submitted share of assigned opportunities; null when nothing is assigned. */
function completionRateOf(counts: ParticipationCounts): number | null {
  return counts.assigned === 0 ? null : counts.submitted / counts.assigned;
}

/**
 * Build the canonical participation projection over raw in-scope assignment
 * rows. Every row is an opportunity regardless of exclusions (resolved
 * §5.12), so the invariant submitted + inProgress + notStarted = assigned
 * holds by construction. Respondent status is person-level across all of a
 * person's rows (spec §13.3); the input must carry every in-scope assignment
 * of each included person.
 */
export function buildParticipationSummary(rows: ParticipationRow[]): ParticipationSummary {
  const totals = emptyCounts();
  const byStakeholder = new Map<TargetStakeholder, ParticipationCounts>();
  // respondentId -> [assignments seen, submissions seen, responses seen]
  const byRespondent = new Map<string, [number, number, number]>();

  for (const row of rows) {
    accumulate(totals, row);

    let stakeholderCounts = byStakeholder.get(row.stakeholder);
    if (!stakeholderCounts) {
      stakeholderCounts = emptyCounts();
      byStakeholder.set(row.stakeholder, stakeholderCounts);
    }
    accumulate(stakeholderCounts, row);

    const person = byRespondent.get(row.respondentId) ?? [0, 0, 0];
    person[0] += 1;
    if (row.responseStatus !== null) {
      person[2] += 1;
    }
    if (row.responseStatus === "SUBMITTED") {
      person[1] += 1;
    }
    byRespondent.set(row.respondentId, person);
  }

  let complete = 0;
  let partial = 0;
  let notStarted = 0;
  for (const [assignmentCount, submissionCount, responseCount] of byRespondent.values()) {
    if (submissionCount === assignmentCount) {
      complete += 1;
    } else if (responseCount > 0) {
      partial += 1;
    } else {
      notStarted += 1;
    }
  }

  const stakeholders: StakeholderParticipation[] = STAKEHOLDER_ORDER.filter((stakeholder) =>
    byStakeholder.has(stakeholder)
  ).map((stakeholder) => {
    const counts = byStakeholder.get(stakeholder)!;
    return { stakeholder, ...counts, completionRate: completionRateOf(counts) };
  });

  return {
    ...totals,
    completionRate: completionRateOf(totals),
    stakeholders,
    respondents: {
      total: byRespondent.size,
      complete,
      partial,
      notStarted,
    },
  };
}
