"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

type CourseRosterMemberFiltersProps = {
  initialSearch: string;
  initialRemoved: boolean;
  sortDirection: "asc" | "desc";
  assignmentId: string;
  rosterBasePath?: string;
};

/**
 * Member search for one roster. The roster detail has a single free-text scope
 * and no filterable columns of its own, so it keeps its own control rather than
 * the shared column kit.
 */
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
    <div
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
    </div>
  );
}
