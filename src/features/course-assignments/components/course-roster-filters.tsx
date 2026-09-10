"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
type CourseRosterDiscoveryFiltersProps = {
  initialSearch: string;
  initialHistory: boolean;
  onNavigate: (search: string, history: boolean) => void;
  pending: boolean;
};

export function CourseRosterDiscoveryFilters({
  initialSearch,
  initialHistory,
  onNavigate,
  pending,
}: CourseRosterDiscoveryFiltersProps) {
  const [searchDraft, setSearchDraft] = useState(initialSearch);
  const [includeHistory, setIncludeHistory] = useState(initialHistory);
  const [isFocused, setIsFocused] = useState(false);
  // A keystroke marks the draft as a live edit; a server-side search change
  // clears that flag so an armed debounce for the stale draft is cancelled
  // instead of re-navigated. A response echoing our own navigation (the
  // server value matches the last search we sent) is not a server-driven
  // change and keeps the live flag.
  const draftIsLive = useRef(false);
  const lastServerSearch = useRef(initialSearch);
  const lastNavigatedSearch = useRef<string | null>(null);
  // Runs before the debounce effect below: when the server value changes,
  // the pending timer's cleanup already ran, and the stale draft is no
  // longer treated as a live edit.
  useEffect(() => {
    if (lastServerSearch.current === initialSearch) return;
    lastServerSearch.current = initialSearch;
    if (initialSearch !== lastNavigatedSearch.current) {
      draftIsLive.current = false;
    }
  }, [initialSearch]);

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
  // Losing focus or a server-side change cancels the pending timer so a
  // stale draft is never re-navigated.
  useEffect(() => {
    if (!isFocused || !draftIsLive.current || searchDraft === initialSearch) return;
    const timer = setTimeout(() => {
      lastNavigatedSearch.current = searchDraft;
      onNavigate(searchDraft, includeHistory);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDraft, includeHistory, onNavigate, isFocused, initialSearch]);

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
          onChange={(event) => {
            setSearchDraft(event.target.value);
            draftIsLive.current = true;
          }}
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
  const [isPending, startTransition] = useTransition();
  const basePath = `${rosterBasePath ?? "/course-rosters"}/${assignmentId}`;

  const navigate = useCallback(
    (search: string) => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (initialRemoved) params.set("removed", "1");
      params.set("sort", sortDirection);
      startTransition(() => router.replace(`${basePath}?${params.toString()}`));
    },
    [basePath, router, initialRemoved, sortDirection]
  );

  // Search streams in after a quiet pause while typing. The sort direction
  // and removed scope are owned by the column header and the server-driven
  // view, so they are preserved untouched here.
  useEffect(() => {
    if (searchDraft === initialSearch) return;
    const timer = setTimeout(() => navigate(searchDraft), 300);
    return () => clearTimeout(timer);
  }, [searchDraft, initialSearch, navigate]);

  return (
    <FieldGroup
      role="search"
      aria-label="Search roster members"
      aria-busy={isPending || undefined}
      className="flex flex-col gap-3"
    >
      <Field>
        <FieldLabel htmlFor="member-search">Search students</FieldLabel>
        <Input
          id="member-search"
          type="search"
          maxLength={100}
          placeholder="Search by name or email"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
        />
      </Field>
      {isPending ? <Spinner size="sm" label="Updating roster members" /> : null}
    </FieldGroup>
  );
}
