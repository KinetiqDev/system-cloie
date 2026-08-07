"use client";

import { SystemRole } from "@prisma/client";
import { MoreVertical, Mail, Building2, GraduationCap, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { SecretaryUserSummaryItem } from "../../services/list-secretary-users-summary";

interface UsersDataTableProps {
  users: SecretaryUserSummaryItem[];
  onViewUser: (user: SecretaryUserSummaryItem) => void;
  onEditUser: (user: SecretaryUserSummaryItem) => void;
  onToggleActive: (userId: string, currentActive: boolean) => void;
  isPending: boolean;
}

export function UsersDataTable({
  users,
  onViewUser,
  onEditUser,
  onToggleActive,
  isPending,
}: UsersDataTableProps) {
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
    <>
      {/* Desktop Table View */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[200px]">Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Major</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[60px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow
                key={user.id}
                className="motion-safe:transition-colors motion-safe:duration-150"
              >
                <TableCell className="font-medium">
                  {user.firstName} {user.lastName}
                </TableCell>
                <TableCell>
                  {user.activeRole ? (
                    <Badge className={getRoleBadgeClass(user.activeRole)}>
                      {formatRole(user.activeRole)}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>{user.programLabel}</TableCell>
                <TableCell>{user.majorLabel}</TableCell>
                <TableCell>
                  {user.roles.includes(SystemRole.STUDENT) ? (
                    user.sectionLabel
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "success" : "secondary"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="hover:bg-muted text-muted-foreground hover:text-foreground inline-flex size-9 items-center justify-center rounded-md transition-colors">
                      <MoreVertical className="size-4" />
                      <span className="sr-only">User actions</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onViewUser(user)}>
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEditUser(user)}>
                        Edit user
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={isPending}
                        onClick={() => onToggleActive(user.id, user.isActive)}
                        className={user.isActive ? "text-destructive" : "text-success"}
                      >
                        {user.isActive ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="flex flex-col gap-3 md:hidden">
        {users.map((user) => (
          <Card
            key={user.id}
            className="overflow-hidden motion-safe:transition-shadow motion-safe:duration-200 motion-safe:hover:shadow-sm"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-heading text-title-sm text-foreground">
                    {user.firstName} {user.lastName}
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    {user.activeRole ? (
                      <Badge className={getRoleBadgeClass(user.activeRole)}>
                        {formatRole(user.activeRole)}
                      </Badge>
                    ) : null}
                    <Badge variant={user.isActive ? "success" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className="hover:bg-muted text-muted-foreground hover:text-foreground -mr-2 inline-flex size-9 items-center justify-center rounded-md transition-colors">
                    <MoreVertical className="size-4" />
                    <span className="sr-only">User actions</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onViewUser(user)}>
                      View details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditUser(user)}>Edit user</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={isPending}
                      onClick={() => onToggleActive(user.id, user.isActive)}
                      className={user.isActive ? "text-destructive" : "text-success"}
                    >
                      {user.isActive ? "Deactivate" : "Activate"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pt-0">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="text-muted-foreground size-4" />
                <span className="text-muted-foreground">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="text-muted-foreground size-4" />
                <span>{user.programLabel}</span>
                {user.majorLabel && (
                  <span className="text-muted-foreground">• {user.majorLabel}</span>
                )}
              </div>
              {user.roles.includes(SystemRole.STUDENT) && user.sectionLabel && (
                <div className="flex items-center gap-2 text-sm">
                  <GraduationCap className="text-muted-foreground size-4" />
                  <span>{user.sectionLabel}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
