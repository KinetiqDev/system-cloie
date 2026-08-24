"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { CourseRosterViewMode } from "./course-roster-view-selector";

type CourseRosterDiscoveryFiltersProps = {
  initialSearch: string;
  initialHistory: boolean;
  view: CourseRosterViewMode;
  onNavigate: (search: string, history: boolean) => void;
  pending: boolean;
};

export function CourseRosterDiscoveryFilters({
  initialSearch,
  initialHistory,
  view,
  onNavigate,
  pending,
}: CourseRosterDiscoveryFiltersProps) {
  const [searchDraft, setSearchDraft] = useState(initialSearch);
  const [includeHistory, setIncludeHistory] = useState(initialHistory);
  const [isFocused, setIsFocused] = useState(false);

  // Server-driven history changes (e.g. the Clear filters link) reset the
  // checkbox. A pending navigation is skipped so an in-flight response never
  // clobbers a toggle the user just made.
  if (!pending && includeHistory !== initialHistory) {
    setIncludeHistory(initialHistory);
  }

  // Server-side search changes (e.g. the Clear filters link) reset the draft,
  // but never overwrite an in-progress keystroke: the sync is deferred until
  // the input loses focus, so a focused field keeps the user's text and a
  // blur always re-adopts the server value.
  if (!isFocused && searchDraft !== initialSearch) {
    setSearchDraft(initialSearch);
  }

  // Search streams in after a quiet pause while typing; the history checkbox
  // applies immediately. Both preserve the server-side view and pagination.
  // Losing focus cancels the pending timer so a discarded draft is never
  // re-navigated.
  useEffect(() => {
    if (!isFocused || searchDraft === initialSearch) return;
    const timer = setTimeout(() => onNavigate(searchDraft, includeHistory), 300);
    return () => clearTimeout(timer);
  }, [searchDraft, includeHistory, view, onNavigate, isFocused]);

  return (
    <FieldGroup
      role="search"
      aria-label="Search course rosters"
      aria-busy={pending || undefined}
      className="flex flex-col gap-3"
    >
      <Field>
        <FieldLabel htmlFor="roster-search">Search assignments</FieldLabel>
        <Input
          id="roster-search"
          type="search"
          maxLength={100}
          placeholder="Course or program"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </Field>
      <Field orientation="horizontal" className="min-h-11 w-fit">
        <Checkbox
          id="roster-history"
          checked={includeHistory}
          onCheckedChange={(checked) => {
            setIncludeHistory(checked);
            onNavigate(searchDraft, checked);
          }}
        />
        <FieldLabel htmlFor="roster-history">
          Include inactive and completed assignment history
        </FieldLabel>
      </Field>
    </FieldGroup>
  );
}

type CourseRosterMemberFiltersProps = {
  initialSearch: string;
  initialRemoved: boolean;
  sortDirection: "asc" | "desc";
  assignmentId: string;
  rosterBasePath?: string;
};

export function CourseRosterMemberFilters({
  initialSearch,
  initialRemoved,
  sortDirection,
  assignmentId,
  rosterBasePath,
}: CourseRosterMemberFiltersProps) {
  const router = useRouter();
  const [searchDraft, setSearchDraft] = useState(initialSearch);
  const [includeRemoved, setIncludeRemoved] = useState(initialRemoved);
  const [isPending, startTransition] = useTransition();
  const basePath = `${rosterBasePath ?? "/course-rosters"}/${assignmentId}`;
  const nextSort: "asc" | "desc" = sortDirection === "asc" ? "desc" : "asc";

  const navigate = (search: string, removed: boolean, sort: "asc" | "desc") => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (removed) params.set("removed", "1");
    params.set("sort", sort);
    startTransition(() => router.replace(`${basePath}?${params.toString()}`));
  };

  // Search streams in after a quiet pause while typing; the removed checkbox
  // and the sort toggle apply immediately. Both preserve route scope.
  useEffect(() => {
    if (searchDraft === initialSearch) return;
    const timer = setTimeout(() => navigate(searchDraft, includeRemoved, sortDirection), 300);
    return () => clearTimeout(timer);
  }, [searchDraft, includeRemoved, sortDirection]);

  return (
    <div
      role="search"
      aria-label="Search roster members"
      aria-busy={isPending || undefined}
      className="flex flex-col gap-4"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <label htmlFor="member-search" className="text-sm font-medium">
          Search students
        </label>
        <Input
          id="member-search"
          type="search"
          maxLength={100}
          placeholder="Search by name or email"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {isPending ? <Spinner size="sm" label="Updating roster members" /> : null}
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={includeRemoved}
            onChange={(event) => {
              const checked = event.target.checked;
              setIncludeRemoved(checked);
              navigate(searchDraft, checked, sortDirection);
            }}
            className="accent-primary size-4"
          />
          Include removed students
        </label>
        <button
          type="button"
          aria-label={`Sort by name ${nextSort === "asc" ? "ascending" : "descending"}`}
          className="focus-visible:ring-ring text-link inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:outline-none"
          onClick={() => navigate(searchDraft, includeRemoved, nextSort)}
        >
          Sort by name {nextSort === "asc" ? "ascending" : "descending"}
        </button>
      </div>
    </div>
  );
}
