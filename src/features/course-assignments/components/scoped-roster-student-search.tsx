"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { YearLevel, StudentSection } from "@prisma/client";
import { CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
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
  inputId?: string;
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
  inputId = "roster-student-search",
  inputAriaLabel = "Search students",
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
    <section className="flex flex-col gap-2" aria-label="Search students eligible for this roster">
      <p id={`${inputId}-hint`} className="text-body-sm text-muted-foreground">
        Type at least 2 letters of the student&apos;s enrolled name. Only students who can join
        this class are shown.
      </p>
      <Input
        id={inputId}
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
                ? `Enter at least ${MIN_ROSTER_SEARCH_CHARACTERS} characters to search students.`
                : null
              : null
          );
        }}
        placeholder="e.g. Maria Santos"
        aria-label={inputAriaLabel}
        aria-describedby={`${inputId}-hint scoped-roster-student-search-status`}
        autoComplete="off"
      />
      <div id="scoped-roster-student-search-status" aria-live="polite" className="text-body-sm">
        {isPending && <Spinner size="sm" label="Searching students" />}
        {!isPending && message && <span className="text-muted-foreground">{message}</span>}
      </div>
      {candidates.length > 0 && (
        <ul
          className="divide-border border-border max-h-64 divide-y overflow-y-auto rounded-lg border"
          aria-label="Matching students"
        >
          {candidates.map((candidate) => {
            const isSelected = selectedUserId === candidate.userId;
            return (
              <li key={candidate.userId}>
                <button
                  type="button"
                  onClick={() => onSelect?.(candidate)}
                  disabled={!candidate.selectable}
                  aria-pressed={isSelected}
                  className={cn(
                    "hover:bg-accent focus-visible:ring-ring flex min-h-11 w-full flex-col items-start gap-1 px-3 py-2 text-left focus-visible:ring-3 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70",
                    "aria-pressed:bg-selected-bg aria-pressed:shadow-[inset_0_0_0_2px_var(--color-primary)]"
                  )}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-medium">{candidate.name}</span>
                    {isSelected && (
                      <span className="text-selected-fg inline-flex shrink-0 items-center gap-1 text-xs font-semibold">
                        <CheckCircle2 aria-hidden="true" className="size-4" />
                        Selected
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground text-sm">{candidate.email}</span>
                  <span className="text-muted-foreground text-body-sm">
                    {candidateAcademicContext(candidate)}
                  </span>
                  {!candidate.selectable && candidate.reason && (
                    <Badge variant="warning">{candidate.reason.replaceAll("_", " ")}</Badge>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
