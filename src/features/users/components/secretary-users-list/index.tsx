"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  SecretaryUserSummaryItem,
  SecretaryUsersKPI,
} from "../../services/list-secretary-users-summary";
import { SystemRole, YearLevel } from "@prisma/client";
import { UsersKPI } from "./users-kpi";
import { UsersFilterBar } from "./users-filter-bar";
import { UsersDataTable } from "./users-data-table";
import { UsersPagination } from "./users-pagination";
import { UserDialogs, useToggleUserActive } from "./user-dialogs";
import { EditUserDialog } from "./edit-user-dialog";

const PAGE_SIZE = 15;

interface SecretaryUsersListProps {
  users: SecretaryUserSummaryItem[];
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
  kpi,
  programs,
  yearLevels,
  currentUserId,
}: SecretaryUsersListProps) {
  // ---- Filter state -------------------------------------------------------
  const [roleFilter, setRoleFilter] = useState<string>("__all__");
  const [programFilter, setProgramFilter] = useState<string>("__all__");
  const [majorFilter, setMajorFilter] = useState<string>("__all__");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // ---- Modal state ---------------------------------------------------------
  const [viewUser, setViewUser] = useState<SecretaryUserSummaryItem | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);

  // ---- Toggle active hook --------------------------------------------------
  const { toggleActive, isPending } = useToggleUserActive();

  // ---- Derived: refresh data after mutation ------------------------------
  const handleUserUpdated = () => {
    // In a real app, this would re-fetch data
    // For now, we rely on the parent page re-rendering with new props
    window.location.reload();
  };

  // ---- Filter logic --------------------------------------------------------
  const filteredUsers = useMemo(() => {
    let result = users;

    if (roleFilter !== "__all__") {
      result = result.filter((u) => u.roles.includes(roleFilter as SystemRole));
    }

    if (programFilter !== "__all__") {
      result = result.filter((u) => u.programLabel.includes(programFilter));
    }

    if (majorFilter !== "__all__") {
      result = result.filter((u) => u.majorLabel === majorFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (u) =>
          u.firstName.toLowerCase().includes(term) ||
          u.lastName.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term)
      );
    }

    return result;
  }, [users, roleFilter, programFilter, majorFilter, searchTerm]);

  // ---- Pagination ----------------------------------------------------------
  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const safePage = Math.min(Math.max(1, currentPage), totalPages || 1);
  const paginatedUsers = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ---- Handlers ------------------------------------------------------------
  const handleProgramChange = (value: string | null) => {
    setProgramFilter(value ?? "__all__");
    setMajorFilter("__all__");
    setCurrentPage(1);
  };

  const handleRoleChange = (value: string | null) => {
    setRoleFilter(value ?? "__all__");
    setCurrentPage(1);
  };

  const handleMajorChange = (value: string | null) => {
    setMajorFilter(value ?? "__all__");
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleToggleActive = (userId: string, currentActive: boolean) => {
    toggleActive(userId, currentActive, handleUserUpdated);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
        <p className="text-muted-foreground text-sm">
          Manage users, roles, and academic contexts across the institution.
        </p>
      </div>

      {/* KPI Cards */}
      <UsersKPI kpi={kpi} />

      {/* Header + Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Users</h2>
          <p className="text-muted-foreground text-sm">
            {filteredUsers.length} total user{filteredUsers.length !== 1 ? "s" : ""}
            {filteredUsers.length !== users.length && ` (${users.length} overall)`}
          </p>
        </div>
        <Link href="/secretary/users/new">
          <Button className="motion-safe:transition-colors motion-safe:duration-150">
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <UsersFilterBar
        roleFilter={roleFilter}
        onRoleChange={handleRoleChange}
        programFilter={programFilter}
        onProgramChange={handleProgramChange}
        majorFilter={majorFilter}
        onMajorChange={handleMajorChange}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        programs={programs}
      />

      {/* Data Table */}
      <UsersDataTable
        users={paginatedUsers}
        onViewUser={setViewUser}
        onEditUser={(user) => setEditUserId(user.id)}
        onToggleActive={handleToggleActive}
        isPending={isPending}
      />

      {/* Pagination */}
      <UsersPagination
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Dialogs */}
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
