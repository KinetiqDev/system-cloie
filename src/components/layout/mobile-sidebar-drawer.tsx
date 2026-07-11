"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/constants/roles";
import { getMainNavByRoles } from "@/lib/constants/navigation";

interface MobileSidebarDrawerProps {
  roles?: Role[];
  user?: {
    name?: string | null;
    email?: string | null;
  };
}

function MobileSidebarDrawerTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-text-muted hover:bg-surface-muted hover:text-text-primary flex size-9 items-center justify-center rounded-md transition-colors lg:hidden"
      aria-label="Open navigation menu"
    >
      <Menu className="size-5" />
    </button>
  );
}

export function MobileSidebarDrawer({ roles = [], user }: MobileSidebarDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const mainNav = getMainNavByRoles(roles);

  return (
    <>
      {/* Trigger button — rendered in the topbar */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-text-muted hover:bg-surface-muted hover:text-text-primary flex size-9 items-center justify-center rounded-md transition-colors lg:hidden"
        aria-label="Open navigation menu"
      >
        <Menu className="size-5" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          "bg-surface fixed inset-y-0 left-0 z-50 flex w-72 flex-col shadow-xl transition-transform duration-300 ease-in-out lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="border-border flex h-16 shrink-0 items-center justify-between border-b px-5">
          <div className="flex items-center gap-3">
            <Image
              src="/logos/cloie-logo.png"
              alt="System CLOIE Logo"
              width={28}
              height={28}
              className="rounded"
            />
            <span className="text-title-md text-primary font-bold tracking-tight">System CLOIE</span>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-text-muted hover:bg-surface-muted hover:text-text-primary flex size-8 items-center justify-center rounded-md transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <div className="space-y-1">
            {mainNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "text-body-md flex items-center gap-3 rounded-md px-3 py-2.5 font-medium transition-colors",
                    isActive
                      ? "bg-primary-soft text-primary"
                      : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  )}
                >
                  <item.icon
                    className={cn("size-5 shrink-0", isActive ? "text-primary" : "text-text-muted")}
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User info footer */}
        {user && (
          <div className="border-border border-t p-4">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="bg-primary flex size-9 shrink-0 items-center justify-center rounded-full text-white">
                <span className="text-body-sm font-semibold">{user.name?.[0] || "U"}</span>
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-label-md text-text-primary truncate font-semibold">
                  {user.name || "User"}
                </span>
                <span className="text-caption text-text-muted truncate">{user.email || ""}</span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
