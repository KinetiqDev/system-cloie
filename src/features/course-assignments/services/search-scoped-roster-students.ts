import { normalizeRosterName } from "./course-roster-csv";
import { loadScopedRosterCandidates, type ScopedRosterCandidate } from "./course-roster-candidate-scope";
import type { RosterServiceResult } from "../types";

export const MIN_ROSTER_SEARCH_CHARACTERS = 2;
export const MAX_ROSTER_SEARCH_RESULTS = 10;

export type ScopedRosterStudentSearch = {
  assignmentId: string;
  candidates: ScopedRosterCandidate[];
};

function searchKey(value: string) {
  return normalizeRosterName(value).toLocaleLowerCase();
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

  const scoped = await loadScopedRosterCandidates(assignmentId, programId);
  if (!scoped.success) return scoped;

  const candidates = scoped.data.candidates
    .filter((candidate) => searchKey(candidate.name).includes(normalizedQuery))
    .sort((left, right) => compareCandidates(left, right, normalizedQuery))
    .slice(0, MAX_ROSTER_SEARCH_RESULTS);

  return { success: true, data: { assignmentId: scoped.data.assignment.assignmentId, candidates } };
}
