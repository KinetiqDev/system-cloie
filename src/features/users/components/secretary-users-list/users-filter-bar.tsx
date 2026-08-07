"use client";

import { useMemo } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SystemRole } from "@prisma/client";
import type {
  SecretaryUsersSortDirection,
  SecretaryUsersSortField,
} from "../../schemas/secretary-users-list";
import { formatRole } from "@/features/users/lib/role-visuals";

const ALL_ROLES: SystemRole[] = [
  SystemRole.SECRETARY,
  SystemRole.DEAN,
  SystemRole.PROGRAM_HEAD,
  SystemRole.FACULTY,
  SystemRole.STUDENT,
  SystemRole.ALUMNI,
  SystemRole.INDUSTRY_PARTNER,
];

interface UsersFilterBarProps {
  roleFilter: string;
  onRoleChange: (value: string | null) => void;
  programFilter: string;
  onProgramChange: (value: string | null) => void;
  majorFilter: string;
  onMajorChange: (value: string | null) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onClearFilters: () => void;
  sort: SecretaryUsersSortField;
  direction: SecretaryUsersSortDirection;
  onSortChange: (value: string | null) => void;
  onDirectionChange: (value: string | null) => void;
  programs: Array<{
    id: string;
    code: string;
    name: string;
    majors: Array<{ id: string; name: string }>;
  }>;
}

export function UsersFilterBar({
  roleFilter,
  onRoleChange,
  programFilter,
  onProgramChange,
  majorFilter,
  onMajorChange,
  searchTerm,
  onSearchChange,
  onClearFilters,
  sort,
  direction,
  onSortChange,
  onDirectionChange,
  programs,
}: UsersFilterBarProps) {
  const selectedProgramMajors = useMemo(() => {
    if (programFilter === "__all__") return [];
    const prog = programs.find((p) => p.code === programFilter);
    return prog?.majors ?? [];
  }, [programFilter, programs]);

  const hasActiveFilters =
    roleFilter !== "__all__" ||
    programFilter !== "__all__" ||
    majorFilter !== "__all__" ||
    searchTerm.trim().length > 0;

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      {/* Role filter */}
      <Select value={roleFilter} onValueChange={(v) => onRoleChange(v)}>
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue>
            {roleFilter === "__all__" ? "All Roles" : formatRole(roleFilter as SystemRole)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All Roles</SelectItem>
          {ALL_ROLES.map((role) => (
            <SelectItem key={role} value={role}>
              {formatRole(role)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Program filter */}
      <Select value={programFilter} onValueChange={(v) => onProgramChange(v)}>
        <SelectTrigger className="w-full md:w-[220px]">
          <SelectValue>
            {programFilter === "__all__"
              ? "All Programs"
              : (programs.find((p) => p.code === programFilter)?.code ?? programFilter)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All Programs</SelectItem>
          {programs.map((p) => (
            <SelectItem key={p.id} value={p.code}>
              {p.code} — {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Major filter — only shown when selected program has majors */}
      {selectedProgramMajors.length > 0 && (
        <Select value={majorFilter} onValueChange={(v) => onMajorChange(v)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue>
              {majorFilter === "__all__"
                ? "All Majors"
                : (selectedProgramMajors.find((m) => m.name === majorFilter)?.name ?? majorFilter)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Majors</SelectItem>
            {selectedProgramMajors.map((m) => (
              <SelectItem key={m.id} value={m.name}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={sort} onValueChange={onSortChange}>
        <SelectTrigger aria-label="Sort users" className="w-full md:w-[160px]">
          <SelectValue>
            Sort:{" "}
            {sort === "firstName"
              ? "First name"
              : sort === "lastName"
                ? "Last name"
                : sort === "email"
                  ? "Email"
                  : "Status"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="lastName">Sort: Last name</SelectItem>
          <SelectItem value="firstName">Sort: First name</SelectItem>
          <SelectItem value="email">Sort: Email</SelectItem>
          <SelectItem value="isActive">Sort: Status</SelectItem>
        </SelectContent>
      </Select>

      <Select value={direction} onValueChange={onDirectionChange}>
        <SelectTrigger aria-label="Sort direction" className="w-full md:w-[130px]">
          <SelectValue>{direction === "asc" ? "Ascending" : "Descending"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="asc">Ascending</SelectItem>
          <SelectItem value="desc">Descending</SelectItem>
        </SelectContent>
      </Select>

      {/* Search */}
      <div className="relative w-full md:ml-auto md:max-w-xs">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange("")}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 -translate-y-1/2 rounded-full p-2 transition-colors"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-9 shrink-0">
          Clear all
        </Button>
      )}
    </div>
  );
}
