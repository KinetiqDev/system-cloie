"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import type { RoleSwitcherUser } from "./role-switcher";
import { RoleSwitcherList } from "./role-switcher-list";

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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const switchRole = async (user: RoleSwitcherUser) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [requestKey]: user.email }),
      });
      let data: { success?: boolean; destination?: string; error?: string };

      try {
        data = (await response.json()) as typeof data;
      } catch {
        setError("Role switch failed.");
        return;
      }

      if (!response.ok || !data.success) {
        setError(data.error ?? "Role switch failed.");
        return;
      }

      setOpen(false);
      router.push(data.destination ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Role switch failed.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleRoleClick = (user: RoleSwitcherUser) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    startTransition(() => void switchRole(user));
  };

  const query = search.toLowerCase();
  const filteredUsers = users.filter(
    (user) =>
      user.label.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
  );

  const storageKey = `mobile-${title.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <div className="lg:hidden">
      <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
        <DrawerTrigger
          render={
            <Button
              size="sm"
              className={`fixed right-4 bottom-20 z-40 gap-1.5 rounded-full px-3 shadow-lg transition-opacity ${open ? "opacity-0" : ""}`}
              aria-label="Open role switcher"
            >
              <Users className="size-3.5" />
              <span className="text-xs font-semibold">{title}</span>
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
                storageKey={storageKey}
                users={filteredUsers}
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
