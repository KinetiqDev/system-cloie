"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import type { RoleSwitcherUser } from "./role-switcher-list";
import { RoleSwitcherList } from "./role-switcher-list";
import { useRoleSwitch } from "./use-role-switch";

type MobileRoleSwitcherProps = {
  activeEmail?: string | null;
  users: readonly RoleSwitcherUser[];
  endpoint: string;
  requestKey: "email" | "identifier";
  title: string;
  description: string;
};

export function MobileRoleSwitcher({
  activeEmail,
  users,
  endpoint,
  requestKey,
  title,
  description,
}: MobileRoleSwitcherProps) {
  const [open, setOpen] = useState(false);
  const { search, setSearch, error, isSubmitting, filteredUsers, handleRoleClick } = useRoleSwitch({
    endpoint,
    requestKey,
    users,
    onSwitchSuccess: () => setOpen(false),
  });

  const searchInputId = `mobile-${title.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <div className="lg:hidden">
      <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
        <DrawerTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              className="rounded-full shadow-xs"
              aria-label={`Open ${title} switcher`}
            >
              <Users aria-hidden="true" />
            </Button>
          }
        />
        <DrawerContent className="max-h-[70vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-2 px-4 pb-6">
            <div className="grid max-h-[40vh] gap-1.5 overflow-y-auto pr-1">
              <RoleSwitcherList
                activeEmail={activeEmail}
                error={error}
                isSubmitting={isSubmitting}
                search={search}
                onSearchChange={setSearch}
                onSwitch={handleRoleClick}
                searchInputId={searchInputId}
                users={filteredUsers}
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
