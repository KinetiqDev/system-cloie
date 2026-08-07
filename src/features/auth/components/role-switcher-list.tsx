"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

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
          className="rounded-md border border-red-100 bg-red-50 px-2 py-1.5 text-[11px] text-red-600"
        >
          {error}
        </p>
      )}
      <div className="relative mb-1">
        <Search
          className="text-text-muted pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          type="text"
          id={`${searchInputId}-search`}
          name={`${searchInputId}-search`}
          aria-label="Search roles"
          placeholder="Search roles..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="border-border bg-background text-text-primary placeholder:text-text-muted w-full rounded-md border py-1.5 pr-2 pl-6 text-[11px] outline-none focus:ring-1 focus:ring-blue-500"
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
                <p className="text-text-muted truncate text-[10px]">{user.email}</p>
              </div>
              <span className="bg-surface-muted text-text-secondary shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase">
                {user.role.replaceAll("_", " ")}
              </span>
            </div>
          </button>
        );
      })}
    </>
  );
}
