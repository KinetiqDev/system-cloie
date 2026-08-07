"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export type RoleSwitcherUser = {
  email: string;
  label: string;
  role: string;
};

export type RoleSwitcherListProps = {
  activeEmail?: string | null;
  error: string | null;
  isSubmitting: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onSwitch: (user: RoleSwitcherUser) => void;
  searchInputId: string;
  users: readonly RoleSwitcherUser[];
};

export function RoleSwitcherList({
  activeEmail,
  error,
  isSubmitting,
  search,
  onSearchChange,
  onSwitch,
  searchInputId,
  users,
}: RoleSwitcherListProps) {
  return (
    <>
      {error && (
        <p
          role="alert"
          className="border-danger/50 bg-danger-soft text-caption text-danger rounded-md border px-2 py-1.5"
        >
          {error}
        </p>
      )}
      <div className="relative mb-1">
        <Search
          className="text-text-muted pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          type="text"
          id={`${searchInputId}-search`}
          name={`${searchInputId}-search`}
          aria-label="Search roles"
          placeholder="Search roles..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pr-2 pl-6"
        />
      </div>
      {users.map((user) => {
        const isActive = user.email === activeEmail;

        return (
          <button
            key={user.email}
            type="button"
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-left transition-colors",
              "focus-visible:ring-ring focus-visible:ring-3 focus-visible:outline-none",
              isActive
                ? "border-primary bg-primary-soft text-selected-fg"
                : "border-border bg-background hover:border-primary/40 hover:bg-primary-soft/40"
            )}
            aria-label={`Switch to ${user.label}`}
            disabled={isSubmitting}
            onClick={() => onSwitch(user)}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{user.label}</p>
                <p className="text-text-muted text-caption truncate">{user.email}</p>
              </div>
              <span className="bg-surface-muted text-text-secondary text-caption shrink-0 rounded-full px-1.5 py-0.5 font-semibold tracking-wider uppercase">
                {user.role.replaceAll("_", " ")}
              </span>
            </div>
          </button>
        );
      })}
    </>
  );
}
