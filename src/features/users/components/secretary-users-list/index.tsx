"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { YearLevel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import type {
  SecretaryUserSummaryItem,
  SecretaryUsersKPI,
} from "../../services/list-secretary-users-summary";
import type { SecretaryUsersListQuery } from "../../schemas/secretary-users-list";
import { serializeSecretaryUsersListQuery } from "../../schemas/secretary-users-list";
import { UsersKPI } from "./users-kpi";
import { UsersFilterBar } from "./users-filter-bar";
import { UsersDataTable } from "./users-data-table";
import { UsersPagination } from "./users-pagination";
import { UserDialogs, useToggleUserActive } from "./user-dialogs";
import { EditUserDialog } from "./edit-user-dialog";

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
  currentUserId,
}: SecretaryUsersListProps) {
  const [viewUser, setViewUser] = useState<SecretaryUserSummaryItem | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [isNavigating, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const { toggleActive, isPending: isMutating } = useToggleUserActive();

  const [searchDraft, setSearchDraft] = useState(query.q ?? "");

  const totalPages = Math.ceil(total / pageSize);

  const navigateWithQuery = (next: Partial<SecretaryUsersListQuery>) => {
    const nextQuery = { ...query, ...next };
    const search = serializeSecretaryUsersListQuery(nextQuery);
    startTransition(() => router.replace(search ? `${pathname}?${search}` : pathname));
  };

  useEffect(() => {
    const nextQ = searchDraft.trim() || undefined;
    if (nextQ === (query.q || undefined) && query.page === 1) return;
    const timer = setTimeout(() => navigateWithQuery({ q: nextQ, page: 1 }), 300);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  const handleUserUpdated = () => router.refresh();
  const handleToggleActive = (userId: string, currentActive: boolean) => {
    toggleActive(userId, currentActive, handleUserUpdated);
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
        roleFilter={query.role ?? "__all__"}
        onRoleChange={(value) =>
          navigateWithQuery({
            role:
              value && value !== "__all__" ? (value as SecretaryUsersListQuery["role"]) : undefined,
            page: 1,
          })
        }
        programFilter={query.program ?? "__all__"}
        onProgramChange={(value) =>
          navigateWithQuery({
            program: value && value !== "__all__" ? value : undefined,
            major: undefined,
            page: 1,
          })
        }
        majorFilter={query.major ?? "__all__"}
        onMajorChange={(value) =>
          navigateWithQuery({ major: value && value !== "__all__" ? value : undefined, page: 1 })
        }
        searchTerm={searchDraft}
        onSearchChange={setSearchDraft}
        onClearFilters={() =>
          navigateWithQuery({
            role: undefined,
            program: undefined,
            major: undefined,
            q: undefined,
            page: 1,
          })
        }
        sort={query.sort}
        direction={query.direction}
        onSortChange={(value) =>
          navigateWithQuery({
            sort: (value ?? "name") as SecretaryUsersListQuery["sort"],
            page: 1,
          })
        }
        onDirectionChange={(value) =>
          navigateWithQuery({
            direction: (value ?? "asc") as SecretaryUsersListQuery["direction"],
            page: 1,
          })
        }
        programs={programs}
      />

      <UsersDataTable
        users={users}
        onViewUser={setViewUser}
        onEditUser={(user) => setEditUserId(user.id)}
        onToggleActive={handleToggleActive}
        isPending={isMutating}
      />

      <UsersPagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(nextPage) => navigateWithQuery({ page: nextPage })}
      />

      {isNavigating && (
        <p className="text-muted-foreground text-center text-sm" role="status">
          Loading users...
        </p>
      )}

      <UserDialogs
        viewUser={viewUser}
        onCloseView={() => setViewUser(null)}
        onUserUpdated={handleUserUpdated}
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
export * from "./users-pagination";
export * from "./user-dialogs";
