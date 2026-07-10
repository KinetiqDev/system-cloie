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
import type { SecretaryUserSummaryItem } from "../../services/list-secretary-users-summary";

/** Returns accessible Tailwind bg+text classes for each role. */
function getRoleBadgeClass(role: SystemRole): string {
  switch (role) {
    case SystemRole.SECRETARY:
      return "bg-red-100 text-red-700";
    case SystemRole.DEAN:
      return "bg-purple-100 text-purple-700";
    case SystemRole.PROGRAM_HEAD:
      return "bg-indigo-100 text-indigo-700";
    case SystemRole.FACULTY:
      return "bg-blue-100 text-blue-700";
    case SystemRole.STUDENT:
      return "bg-emerald-100 text-emerald-700";
    case SystemRole.ALUMNI:
      return "bg-amber-100 text-amber-800";
    case SystemRole.INDUSTRY_PARTNER:
      return "bg-sky-100 text-sky-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

/** Format `PROGRAM_HEAD` → `"Program Head"` */
function formatRole(role: SystemRole): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

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
      <div className="bg-muted/50 rounded-lg border py-12 text-center">
        <Users className="text-muted-foreground/50 mx-auto mb-3 h-12 w-12" />
        <h3 className="text-lg font-medium">No users found</h3>
        <p className="text-muted-foreground mt-1 max-w-sm mx-auto text-sm">
          Try adjusting your filters or search to find what you&apos;re looking for.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <Table>
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
                <TableCell className="text-muted-foreground text-sm">
                  {user.email}
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "default" : "secondary"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="hover:bg-muted text-muted-foreground hover:text-foreground inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors">
                      <MoreVertical className="h-4 w-4" />
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
                        className={user.isActive ? "text-destructive" : "text-emerald-600"}
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
      <div className="md:hidden space-y-3">
        {users.map((user) => (
          <Card
            key={user.id}
            className="motion-safe:transition-shadow motion-safe:duration-200 motion-safe:hover:shadow-sm overflow-hidden"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">
                    {user.firstName} {user.lastName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {user.activeRole ? (
                      <Badge className={getRoleBadgeClass(user.activeRole)}>
                        {formatRole(user.activeRole)}
                      </Badge>
                    ) : null}
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className="hover:bg-muted text-muted-foreground hover:text-foreground -mr-2 inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors">
                    <MoreVertical className="h-4 w-4" />
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
                      className={user.isActive ? "text-destructive" : "text-emerald-600"}
                    >
                      {user.isActive ? "Deactivate" : "Activate"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="text-muted-foreground h-4 w-4" />
                <span className="text-muted-foreground">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="text-muted-foreground h-4 w-4" />
                <span>{user.programLabel}</span>
                {user.majorLabel && (
                  <span className="text-muted-foreground">• {user.majorLabel}</span>
                )}
              </div>
              {user.roles.includes(SystemRole.STUDENT) && user.sectionLabel && (
                <div className="flex items-center gap-2 text-sm">
                  <GraduationCap className="text-muted-foreground h-4 w-4" />
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
