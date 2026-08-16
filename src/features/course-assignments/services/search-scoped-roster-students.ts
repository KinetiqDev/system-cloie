import { randomUUID } from "node:crypto";

import { loadScopedRosterCandidates } from "./course-roster-candidate-scope";
import { normalizeRosterNameKey } from "./course-roster-name-match";
import type { RosterServiceResult, ScopedRosterCandidate } from "../types";

const MIN_ROSTER_SEARCH_CHARACTERS = 2;
const MAX_ROSTER_SEARCH_RESULTS = 10;

type ScopedRosterStudentSearch = {
  assignmentId: string;
  candidates: ScopedRosterCandidate[];
};

const SAFE_FAILURE_ERROR = "The roster search could not be completed.";

function safeSearchFailure(assignmentId: string, error: unknown) {
  const referenceId = randomUUID();
  console.error("Course roster search failed", {
    operation: "search_scoped_roster_students",
    assignmentId,
    referenceId,
    error:
      error instanceof Error
        ? {
            name: error.name,
            code:
              typeof error === "object" && error !== null && "code" in error
                ? String(error.code)
                : undefined,
          }
        : { type: typeof error },
  });
  return { success: false as const, error: SAFE_FAILURE_ERROR, referenceId };
}

function searchKey(value: string) {
  return normalizeRosterNameKey(value);
}

function rankCandidate(candidate: ScopedRosterCandidate, query: string) {
  const name = searchKey(candidate.name);
  const tokens = name.split(" ");
  const position = name.indexOf(query);
  return [
    candidate.selectable ? 0 : 1,
    name === query ? 0 : tokens.some((token) => token.startsWith(query)) ? 1 : 2,
    position,
    name,
    candidate.userId,
  ] as const;
}

function compareCandidates(left: ScopedRosterCandidate, right: ScopedRosterCandidate, query: string) {
  const leftRank = rankCandidate(left, query);
  const rightRank = rankCandidate(right, query);
  for (let index = 0; index < leftRank.length; index += 1) {
    if (leftRank[index] < rightRank[index]) return -1;
    if (leftRank[index] > rightRank[index]) return 1;
  }
  return 0;
}

/**
 * Finds at most ten assignment-scoped Students. The candidate population is
 * shared with preview; this function only applies the interactive query and
 * ranking contract in memory.
 */
export async function searchScopedRosterStudents(
  assignmentId: string,
  query: string,
  programId?: string
): Promise<RosterServiceResult<ScopedRosterStudentSearch>> {
  const normalizedQuery = searchKey(query);
  if ([...normalizedQuery].length < MIN_ROSTER_SEARCH_CHARACTERS) {
    return {
      success: false,
      error: `Enter at least ${MIN_ROSTER_SEARCH_CHARACTERS} characters to search Students.`,
    };
  }

  try {
    const scoped = await loadScopedRosterCandidates(assignmentId, programId);
    if (!scoped.success) return scoped;

    const candidates = scoped.data.candidates
      .filter((candidate) => searchKey(candidate.name).includes(normalizedQuery))
      .sort((left, right) => compareCandidates(left, right, normalizedQuery))
      .slice(0, MAX_ROSTER_SEARCH_RESULTS);

    return { success: true, data: { assignmentId: scoped.data.assignment.assignmentId, candidates } };
  } catch (error) {
    return safeSearchFailure(assignmentId, error);
  }
}
