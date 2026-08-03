"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoleSwitcherList, type RoleSwitcherUser } from "./role-switcher-list";
import { useRoleSwitch } from "./use-role-switch";

export type RoleSwitcherDropdownProps = {
  activeEmail?: string | null;
  users: readonly RoleSwitcherUser[];
  endpoint: string;
  requestKey: "email" | "identifier";
  title: string;
  description: string;
};

export function RoleSwitcherDropdown({
  activeEmail,
  users,
  endpoint,
  requestKey,
  title,
  description,
}: RoleSwitcherDropdownProps) {
  const [open, setOpen] = useState(false);
  const { search, setSearch, error, isSubmitting, filteredUsers, handleRoleClick } =
    useRoleSwitch({
      endpoint,
      requestKey,
      users,
      onSwitchSuccess: () => setOpen(false),
    });

  const storageKey = `dropdown-${title.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <div className="hidden lg:inline-flex">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" className="gap-1.5">
              <Users className="size-3.5" data-icon="inline-start" />
              <span className="text-xs font-semibold">{title}</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end" sideOffset={8} className="w-64 p-0">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-semibold">{title}</DropdownMenuLabel>
            <DropdownMenuLabel className="text-text-muted py-0 text-[10px] font-normal">
              {description}
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <div className="grid gap-1.5 p-2">
            <RoleSwitcherList
              activeEmail={activeEmail}
              error={error}
              isSubmitting={isSubmitting}
              search={search}
              onSearchChange={setSearch}
              onSwitch={handleRoleClick}
              storageKey={storageKey}
              users={filteredUsers}
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
