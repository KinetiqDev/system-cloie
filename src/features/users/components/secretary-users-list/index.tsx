// fallow-ignore-file code-duplication
"use client";

import { useCallback, useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { SystemRole, YearLevel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import type {
  SecretaryUserSummaryItem,
  SecretaryUsersActivePeriod,
  SecretaryUsersKPI,
} from "../../services/list-secretary-users-summary";
import type { SecretaryUsersListQuery } from "../../schemas/secretary-users-list";
import { serializeSecretaryUsersListQuery } from "../../schemas/secretary-users-list";
import { UsersKPI } from "./users-kpi";
import { UsersFilterBar, type UsersSecondaryFilters } from "./users-filter-bar";
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

  /**
   * A role change swaps which records the list shows, so refinements that
   * describe the previous role's records are dropped with it. Program stays:
   * every role carries one.
   */
  const handleRoleChange = (nextRole: SystemRole | undefined) => {
    navigateWithQuery({
      role: nextRole,
      major: undefined,
      yearLevel: undefined,
      section: undefined,
      state: undefined,
      verification: undefined,
      page: 1,
    });
  };

  const handleFiltersChange = (next: UsersSecondaryFilters) => {
    navigateWithQuery({ ...next, page: 1 });
  };

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-text-primary text-2xl font-black">User Management</h1>
        <p className="text-muted-foreground text-sm">
          Manage users, roles, and academic contexts across the institution.
        </p>
      </div>

      <UsersKPI kpi={kpi} />

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-text-primary text-2xl font-black">Users</h2>
          <p className="text-muted-foreground text-sm">
            {total} total user{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/secretary/users/new">
          <Button className="motion-safe:transition-colors motion-safe:duration-150">
            <Plus className="size-4" data-icon="inline-start" />
            Add User
          </Button>
        </Link>
      </div>

      <UsersFilterBar
        role={appliedQuery.role}
        filters={{
          program: appliedQuery.program,
          major: appliedQuery.major,
          yearLevel: appliedQuery.yearLevel,
          section: appliedQuery.section,
          state: appliedQuery.state,
          verification: appliedQuery.verification,
        }}
        searchTerm={searchDraft}
        activePeriod={activePeriod}
        programs={programs}
        onRoleChange={handleRoleChange}
        onFiltersChange={handleFiltersChange}
        onSearchChange={setSearchDraft}
        onClearFilters={handleClearFilters}
      />

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
      />

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
export * from "./users-filter-bar";
export * from "./users-data-table";
export * from "./user-dialogs";
