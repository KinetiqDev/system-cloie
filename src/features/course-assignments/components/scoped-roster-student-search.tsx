"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { YearLevel, StudentSection } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { getSectionLabel, getYearLevelDisplay } from "@/lib/constants/academic";
import { searchScopedRosterStudentsAction } from "@/lib/actions/course-roster-actions";
import type { ScopedRosterCandidate } from "../types";

const SEARCH_DELAY_MS = 300;
const MIN_ROSTER_SEARCH_CHARACTERS = 2;

type ScopedRosterStudentSearchProps = {
  assignmentId: string;
  programId?: string;
  onSelect?: (candidate: ScopedRosterCandidate) => void;
  onQueryChange?: () => void;
  selectedUserId?: string | null;
  inputAriaLabel?: string;
};

function candidateAcademicContext(candidate: ScopedRosterCandidate) {
  const yearLevel = candidate.yearLevel
    ? getYearLevelDisplay(candidate.yearLevel as YearLevel)
    : null;
  const section = candidate.section ? getSectionLabel(candidate.section as StudentSection) : null;
  return (
    [candidate.programName ?? candidate.programCode, yearLevel, section, candidate.majorName]
      .filter(Boolean)
      .join(" · ") || "—"
  );
}

export function ScopedRosterStudentSearch({
  assignmentId,
  programId,
  onSelect,
  onQueryChange,
  selectedUserId,
  inputAriaLabel = "Search scoped Students",
}: ScopedRosterStudentSearchProps) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<ScopedRosterCandidate[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const requestVersionRef = useRef(0);

  useEffect(() => {
    const normalizedQuery = query.normalize("NFKC").trim().replace(/\s+/gu, " ");
    if ([...normalizedQuery].length < MIN_ROSTER_SEARCH_CHARACTERS) {
      return;
    }

    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    const timeout = setTimeout(() => {
      startTransition(async () => {
        try {
          const result = await searchScopedRosterStudentsAction({
            assignmentId,
            programId,
            query: normalizedQuery,
          });
          if (requestVersion !== requestVersionRef.current) return;
          if (!result.success) {
            setCandidates([]);
            setMessage(result.error);
            return;
          }
          setCandidates(result.data.candidates);
          setMessage(
            result.data.candidates.length === 0 ? "No scoped Students match this search." : null
          );
        } catch {
          if (requestVersion !== requestVersionRef.current) return;
          setCandidates([]);
          setMessage("The roster search could not be completed.");
        }
      });
    }, SEARCH_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [assignmentId, programId, query]);

  return (
    <section className="flex flex-col gap-2" aria-labelledby="scoped-roster-student-search-title">
      <div>
        <h3 id="scoped-roster-student-search-title" className="text-label-md">
          Search scoped Students
        </h3>
        <p className="text-body-sm text-muted-foreground">
          Search by canonical name. Results are limited to Students eligible for this Course roster.
        </p>
      </div>
      <Input
        type="search"
        value={query}
        onChange={(event) => {
          const nextQuery = event.target.value;
          const normalizedNextQuery = nextQuery.normalize("NFKC").trim().replace(/\s+/gu, " ");
          requestVersionRef.current += 1;
          setQuery(nextQuery);
          setCandidates([]);
          onQueryChange?.();
          setMessage(
            [...normalizedNextQuery].length < MIN_ROSTER_SEARCH_CHARACTERS
              ? nextQuery.length > 0
                ? `Enter at least ${MIN_ROSTER_SEARCH_CHARACTERS} characters to search Students.`
                : null
              : null
          );
        }}
        placeholder="Enter at least 2 characters"
        aria-label={inputAriaLabel}
        aria-describedby="scoped-roster-student-search-status"
      />
      <div id="scoped-roster-student-search-status" aria-live="polite" className="text-body-sm">
        {isPending && <Spinner size="sm" label="Searching Students" />}
        {!isPending && message && <span className="text-muted-foreground">{message}</span>}
      </div>
      {candidates.length > 0 && (
        <ul className="divide-y rounded-lg border" aria-label="Scoped Student search results">
          {candidates.map((candidate) => (
            <li key={candidate.userId}>
              <button
                type="button"
                onClick={() => onSelect?.(candidate)}
                disabled={!candidate.selectable}
                aria-pressed={selectedUserId === candidate.userId}
                className="hover:bg-accent focus-visible:ring-ring flex min-h-11 w-full flex-col items-start gap-1 px-3 py-2 text-left focus-visible:ring-3 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="font-medium">{candidate.name}</span>
                <span className="text-muted-foreground text-sm">{candidate.email}</span>
                <span className="text-muted-foreground text-body-sm">
                  {candidateAcademicContext(candidate)}
                </span>
                {!candidate.selectable && candidate.reason && (
                  <Badge variant="warning">{candidate.reason.replaceAll("_", " ")}</Badge>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
