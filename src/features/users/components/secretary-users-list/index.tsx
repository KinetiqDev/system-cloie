// fallow-ignore-file code-duplication
"use client";

import { useCallback, useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { YearLevel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { MobileFilterSheet, TableToolbar } from "@/components/data-table/table-toolbar";
import { facetIsApplied } from "@/components/data-table/types";
import type {
  SecretaryUserSummaryItem,
  SecretaryUsersActivePeriod,
  SecretaryUsersKPI,
} from "../../services/list-secretary-users-summary";
import type { SecretaryUsersListQuery } from "../../schemas/secretary-users-list";
import { serializeSecretaryUsersListQuery } from "../../schemas/secretary-users-list";
import { UsersKPI } from "./users-kpi";
import {
  buildUsersFacets,
  usersFacetPatch,
  UsersToolbarFacetMenu,
  type UsersFacetKey,
  type UsersFacetState,
} from "./users-facets";
import { UsersDataTable } from "./users-data-table";
import { Pagination } from "@/components/ui/pagination";
import { UserDialogs, useToggleUserActive } from "./user-dialogs";
import { EditUserDialog } from "./edit-user-dialog";
import { bulkToggleUsersActiveAction } from "@/lib/actions/management-foundation-actions";
import { showToast } from "@/components/ui/toast";
import { useTableSelection } from "@/hooks/use-table-selection";

interface SecretaryUsersListProps {
  users: SecretaryUserSummaryItem[];
  total: number;
  page: number;
  pageSize: number;
  query: SecretaryUsersListQuery;
  kpi: SecretaryUsersKPI;
  programs: Array<{
    id: string;
    code: string;
    name: string;
    majors: Array<{ id: string; name: string }>;
  }>;
  yearLevels: YearLevel[];
  activePeriod: SecretaryUsersActivePeriod | null;
  currentUserId: string;
}

export function SecretaryUsersList({
  users,
  total,
  page,
  pageSize,
  query,
  kpi,
  programs,
  yearLevels,
  activePeriod,
  currentUserId,
}: SecretaryUsersListProps) {
  const [viewUser, setViewUser] = useState<SecretaryUserSummaryItem | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [isNavigating, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const { toggleActive, isPending: isMutating } = useToggleUserActive();

  const [searchDraft, setSearchDraft] = useState(query.q ?? "");

  // Client-side mirror of the applied list state. The URL stays authoritative —
  // a landed payload resets the mirror — but consecutive changes compose against
  // the latest intent rather than the last rendered payload, so two quick filter
  // changes cannot drop one another.
  const [appliedQuery, setAppliedQuery] = useState(query);
  const [serverQuery, setServerQuery] = useState(query);
  if (query !== serverQuery) {
    setServerQuery(query);
    setAppliedQuery(query);
  }

  const totalPages = Math.ceil(total / pageSize);
  const selection = useTableSelection(
    users.map((user) => user.id),
    `${page}:${appliedQuery.role ?? ""}:${appliedQuery.program ?? ""}:${appliedQuery.major ?? ""}:${appliedQuery.yearLevel ?? ""}:${appliedQuery.section ?? ""}:${appliedQuery.q ?? ""}:${appliedQuery.state ?? ""}:${appliedQuery.verification ?? ""}:${appliedQuery.sort}:${appliedQuery.direction}`
  );

  const navigateWithQuery = useCallback(
    (next: Partial<SecretaryUsersListQuery>) => {
      const nextQuery = { ...appliedQuery, ...next };
      setAppliedQuery(nextQuery);
      const search = serializeSecretaryUsersListQuery(nextQuery);
      startTransition(() => router.replace(search ? `${pathname}?${search}` : pathname));
    },
    [appliedQuery, pathname, router]
  );

  useEffect(() => {
    const nextQ = searchDraft.trim() || undefined;
    if (nextQ === (appliedQuery.q || undefined)) return;
    const timer = setTimeout(() => navigateWithQuery({ q: nextQ, page: 1 }), 300);
    return () => clearTimeout(timer);
  }, [navigateWithQuery, appliedQuery.q, searchDraft]);

  const handleUserUpdated = () => router.refresh();

  // An open View dialog mirrors the refreshed list row so its program labels
  // track the role changes made from inside it; the dialog owns the roles it
  // just mutated locally, so a refresh cannot revert them mid-flight.
  const liveViewUser = viewUser
    ? (users.find((user) => user.id === viewUser.id) ?? viewUser)
    : null;
  const handleToggleActive = (userId: string, currentActive: boolean) => {
    toggleActive(userId, currentActive, handleUserUpdated);
  };
  const handleBulkStatus = (isActive: boolean) => {
    const ids = [...selection.selectedIds];
    startTransition(async () => {
      const result = await bulkToggleUsersActiveAction(ids, isActive);
      if (result.failed.length > 0) {
        showToast(
          `${result.succeeded.length} updated; ${result.failed.length} could not be updated.`,
          "warning"
        );
      } else {
        showToast(`${result.succeeded.length} users ${isActive ? "activated" : "deactivated"}.`);
      }
      selection.clearSelection();
      router.refresh();
    });
  };

  const facetState: UsersFacetState = {
    role: appliedQuery.role,
    program: appliedQuery.program,
    major: appliedQuery.major,
    yearLevel: appliedQuery.yearLevel,
    section: appliedQuery.section,
    state: appliedQuery.state,
    verification: appliedQuery.verification,
  };

  /**
   * A role change swaps which records the list shows, so refinements that
   * describe the previous role's records are dropped with it. Program stays:
   * every role carries one.
   */
  const handleFacetChange = (key: UsersFacetKey, value: string | null) => {
    const patch = usersFacetPatch(key, value);
    navigateWithQuery(
      key === "role"
        ? {
            ...patch,
            // The server rejects refinements outside the new role's presentable
            // context, so the client drops them with the role instead of
            // offering a filter it would immediately canonicalize away.
            major: undefined,
            yearLevel: undefined,
            section: undefined,
            state: undefined,
            verification: undefined,
            page: 1,
          }
        : { ...patch, page: 1 }
    );
  };

  const handleClearPlacement = () =>
    navigateWithQuery({ yearLevel: undefined, section: undefined, page: 1 });

  const handleClearFilters = () => {
    setSearchDraft("");
    navigateWithQuery({
      role: undefined,
      program: undefined,
      major: undefined,
      yearLevel: undefined,
      section: undefined,
      q: undefined,
      state: undefined,
      verification: undefined,
      page: 1,
    });
  };

  const {
    byColumn: columnFacets,
    account: accountFacets,
    all: allFacets,
    placementNote,
  } = buildUsersFacets(facetState, handleFacetChange, { programs, activePeriod });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-heading-xl text-text-primary">User Management</h1>
        <p className="text-body-sm text-text-secondary">
          Manage users, roles, and academic contexts across the institution.
        </p>
      </div>

      <UsersKPI kpi={kpi} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-heading-lg text-text-primary">Users</h2>
          <p className="text-body-sm text-text-secondary">
            {total} total user{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/secretary/users/import" />}>
            Import students
          </Button>
          <Button render={<Link href="/secretary/users/new" />}>
            <Plus data-icon="inline-start" />
            Add User
          </Button>
        </div>
      </div>

      <TableToolbar
        search={{
          id: "users-search",
          label: "Search users",
          placeholder: "Search by name or email...",
          value: searchDraft,
          onChange: setSearchDraft,
        }}
        facets={allFacets}
        onClearAll={handleClearFilters}
      >
        <UsersToolbarFacetMenu facets={accountFacets} className="hidden shrink-0 sm:inline-flex" />
        <div className="md:hidden">
          <MobileFilterSheet
            facets={allFacets}
            activeCount={allFacets.filter(facetIsApplied).length}
            onClearAll={handleClearFilters}
            summary="Show results"
          />
        </div>
      </TableToolbar>

      <UsersDataTable
        users={users}
        onViewUser={setViewUser}
        onEditUser={(user) => setEditUserId(user.id)}
        onToggleActive={handleToggleActive}
        isPending={isMutating}
        selectedIds={selection.selectedIds}
        allSelected={selection.allVisibleSelected}
        someSelected={selection.someVisibleSelected}
        onToggleOne={selection.toggleOne}
        onToggleAll={selection.toggleAllVisible}
        onClearSelection={selection.clearSelection}
        onBulkStatus={handleBulkStatus}
        facets={columnFacets}
        onClearColumn={{ placement: handleClearPlacement }}
      />

      {placementNote ? (
        <p className="text-muted-foreground -mt-4 text-xs leading-normal">{placementNote}</p>
      ) : null}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(nextPage) => navigateWithQuery({ page: nextPage })}
        className="justify-center pt-4"
      />

      {isNavigating && (
        <p className="text-muted-foreground text-center text-sm" role="status">
          Loading users...
        </p>
      )}

      <UserDialogs
        viewUser={liveViewUser}
        onCloseView={() => setViewUser(null)}
        onUserUpdated={handleUserUpdated}
        programs={programs}
      />

      <EditUserDialog
        userId={editUserId}
        currentUserId={currentUserId}
        onClose={() => setEditUserId(null)}
        onUserUpdated={handleUserUpdated}
        programs={programs}
        yearLevels={yearLevels}
      />
    </div>
  );
}

export * from "./users-kpi";
export * from "./users-facets";
export * from "./users-data-table";
export * from "./user-dialogs";
