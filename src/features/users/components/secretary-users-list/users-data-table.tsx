// fallow-ignore-file code-duplication
"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  MoreVertical,
  Mail,
  Building2,
  GraduationCap,
  Power,
  Users,
  Eye,
  Pencil,
  UserX,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterableHead } from "@/components/data-table/filterable-head";
import type { FacetDef } from "@/components/data-table/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatRole, getRoleBadgeClass } from "@/features/users/lib/role-visuals";
import { getPlacementLabel } from "@/lib/constants/academic";
import type { SecretaryUserSummaryItem } from "../../services/list-secretary-users-summary";

interface UsersDataTableProps {
  users: SecretaryUserSummaryItem[];
  onViewUser: (user: SecretaryUserSummaryItem) => void;
  onEditUser: (user: SecretaryUserSummaryItem) => void;
  onToggleActive: (userId: string, currentActive: boolean) => void;
  isPending: boolean;
  selectedIds: Set<string>;
  allSelected: boolean;
  someSelected: boolean;
  onToggleOne: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onClearSelection: () => void;
  onBulkStatus: (isActive: boolean) => void;
  /** One entry per filterable column, keyed by column. */
  facets: UsersTableFacets;
}

export type UsersTableFacets = {
  role: FacetDef[];
  program: FacetDef[];
  major: FacetDef[];
  /** Year level and section, both shown under the Year & Section heading. */
  placement: FacetDef[];
};

type MobileUserCardProps = Pick<
  UsersDataTableProps,
  "onViewUser" | "onEditUser" | "onToggleActive" | "onToggleOne" | "isPending"
> & {
  user: SecretaryUserSummaryItem;
  selected: boolean;
};

function MobileUserBadges({ user }: { user: SecretaryUserSummaryItem }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      {user.roles.map((role) => (
        <Badge key={role} className={getRoleBadgeClass(role)}>
          {formatRole(role)}
        </Badge>
      ))}
      <Badge variant={user.isActive ? "success" : "secondary"}>
        {user.isActive ? "Active" : "Inactive"}
      </Badge>
    </div>
  );
}

function MobileUserAcademicContext({ user }: { user: SecretaryUserSummaryItem }) {
  return (
    <>
      <div className="flex items-center gap-2 text-sm">
        <Building2 className="text-muted-foreground size-4" />
        <span>{user.programLabel}</span>
        {user.majorLabel && <span className="text-muted-foreground">• {user.majorLabel}</span>}
      </div>
      {user.placement && (
        <div className="flex items-center gap-2 text-sm">
          <GraduationCap className="text-muted-foreground size-4" />
          <span>{getPlacementLabel(user.placement)}</span>
        </div>
      )}
    </>
  );
}

function UserActionMenu({
  user,
  onViewUser,
  onEditUser,
  onToggleActive,
  isPending,
  triggerClassName,
}: {
  user: SecretaryUserSummaryItem;
  onViewUser: (user: SecretaryUserSummaryItem) => void;
  onEditUser: (user: SecretaryUserSummaryItem) => void;
  onToggleActive: (id: string, currentState: boolean) => void;
  isPending: boolean;
  triggerClassName?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${user.name}`}
            className={cn("text-muted-foreground hover:text-foreground", triggerClassName)}
          />
        }
      >
        <MoreVertical className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onViewUser(user)}>
          <Eye className="text-muted-foreground" aria-hidden="true" />
          <span>View details</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEditUser(user)}>
          <Pencil className="text-muted-foreground" aria-hidden="true" />
          <span>Edit user</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {user.isActive ? (
          <DropdownMenuItem
            variant="destructive"
            disabled={isPending}
            onClick={() => onToggleActive(user.id, user.isActive)}
          >
            <UserX className="size-4 shrink-0" aria-hidden="true" />
            <span>Deactivate</span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            disabled={isPending}
            onClick={() => onToggleActive(user.id, user.isActive)}
          >
            <UserCheck className="text-success" aria-hidden="true" />
            <span>Activate</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileUserCard({
  user,
  selected,
  onViewUser,
  onEditUser,
  onToggleActive,
  onToggleOne,
  isPending,
}: MobileUserCardProps) {
  return (
    <Card
      data-state={selected ? "selected" : undefined}
      className="data-[state=selected]:bg-selected-bg overflow-hidden motion-safe:transition-shadow motion-safe:duration-200 motion-safe:hover:shadow-sm"
    >
      <CardHeader className="pb-3">
        <Checkbox
          aria-label={`Select ${user.name}`}
          checked={selected}
          onCheckedChange={(checked) => onToggleOne(user.id, Boolean(checked))}
        />
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-heading text-title-sm text-foreground">{user.name}</h3>
            <MobileUserBadges user={user} />
          </div>
          <UserActionMenu
            user={user}
            onViewUser={onViewUser}
            onEditUser={onEditUser}
            onToggleActive={onToggleActive}
            isPending={isPending}
            triggerClassName="-mr-2"
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-0">
        <div className="flex items-center gap-2 text-sm">
          <Mail className="text-muted-foreground size-4" />
          <span className="text-muted-foreground">{user.email}</span>
        </div>
        <MobileUserAcademicContext user={user} />
      </CardContent>
    </Card>
  );
}

export function UsersDataTable({
  users,
  onViewUser,
  onEditUser,
  onToggleActive,
  isPending,
  selectedIds,
  allSelected,
  someSelected,
  onToggleOne,
  onToggleAll,
  onClearSelection,
  onBulkStatus,
  facets,
}: UsersDataTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isSortPending, startSortTransition] = useTransition();

  const rawSort = searchParams.get("sort");
  const activeSort: "name" | "email" | "isActive" =
    rawSort === "email" || rawSort === "isActive" ? rawSort : "name";
  const activeDir: "asc" | "desc" = searchParams.get("dir") === "desc" ? "desc" : "asc";

  const handleSort = (field: "name" | "email" | "isActive") => {
    const nextDir = field === activeSort ? (activeDir === "asc" ? "desc" : "asc") : "asc";
    const params = new URLSearchParams(searchParams.toString());
    // Keep the URL canonical: the default sort (name/asc) omits both params,
    // matching serializeSecretaryUsersListQuery.
    if (field === "name" && nextDir === "asc") {
      params.delete("sort");
    } else {
      params.set("sort", field);
    }
    if (nextDir === "asc") {
      params.delete("dir");
    } else {
      params.set("dir", nextDir);
    }
    // Reset pagination on sort change.
    params.delete("page");
    const qs = params.toString();
    startSortTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  if (users.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyMedia variant="icon">
          <Users aria-hidden className="size-4" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>No users found</EmptyTitle>
          <EmptyDescription>
            Try adjusting your filters or search to find what you&apos;re looking for.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <BulkActionBar selectedCount={selectedIds.size} itemLabel="user" onClear={onClearSelection}>
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => onBulkStatus(true)}>
          <Power aria-hidden="true" className="size-4" />
          Activate
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => onBulkStatus(false)}
        >
          <Power aria-hidden="true" className="size-4" />
          Deactivate
        </Button>
      </BulkActionBar>
      {/* Desktop Table View */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <Table label="Users" className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  aria-label="Select all users on this page"
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={(checked) => onToggleAll(Boolean(checked))}
                />
              </TableHead>
              <FilterableHead
                label="Name"
                className="w-[200px]"
                sort={{
                  isActive: activeSort === "name",
                  direction: activeDir,
                  isPending: isSortPending,
                  onSort: () => handleSort("name"),
                }}
              />
              <FilterableHead label="Role" facets={facets.role} />
              <FilterableHead label="Program" facets={facets.program} />
              <FilterableHead label="Major" facets={facets.major} />
              <FilterableHead label="Year & Section" facets={facets.placement} />
              <FilterableHead
                label="Email"
                sort={{
                  isActive: activeSort === "email",
                  direction: activeDir,
                  isPending: isSortPending,
                  onSort: () => handleSort("email"),
                }}
              />
              <FilterableHead
                label="Status"
                sort={{
                  isActive: activeSort === "isActive",
                  direction: activeDir,
                  isPending: isSortPending,
                  onSort: () => handleSort("isActive"),
                }}
              />
              <TableHead className="w-[60px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow
                key={user.id}
                data-state={selectedIds.has(user.id) ? "selected" : undefined}
                className="motion-safe:transition-colors motion-safe:duration-150"
              >
                <TableCell>
                  <Checkbox
                    aria-label={`Select ${user.name}`}
                    checked={selectedIds.has(user.id)}
                    onCheckedChange={(checked) => onToggleOne(user.id, Boolean(checked))}
                  />
                </TableCell>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>
                  {user.roles.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge key={role} className={getRoleBadgeClass(role)}>
                          {formatRole(role)}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>{user.programLabel}</TableCell>
                <TableCell>{user.majorLabel}</TableCell>
                <TableCell>{getPlacementLabel(user.placement)}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "success" : "secondary"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <UserActionMenu
                    user={user}
                    onViewUser={onViewUser}
                    onEditUser={onEditUser}
                    onToggleActive={onToggleActive}
                    isPending={isPending}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="flex flex-col gap-3 md:hidden">
        {users.map((user) => (
          <MobileUserCard
            key={user.id}
            user={user}
            selected={selectedIds.has(user.id)}
            onViewUser={onViewUser}
            onEditUser={onEditUser}
            onToggleActive={onToggleActive}
            onToggleOne={onToggleOne}
            isPending={isPending}
          />
        ))}
      </div>
    </div>
  );
}
