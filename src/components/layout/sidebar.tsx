"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/constants/roles";
import { getMainNavByRoles, getSecondaryNavByRoles } from "@/lib/constants/navigation";

interface SidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  roles?: Role[];
}

export function Sidebar({ user, roles = [] }: SidebarProps) {
  const pathname = usePathname();

  const mainNav = getMainNavByRoles(roles);
  const secondaryNav = getSecondaryNavByRoles(roles);

  return (
    <aside className="border-border bg-surface fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r lg:flex">
      <div className="border-border flex h-16 shrink-0 items-center border-b px-6">
        <div className="flex items-center gap-3">
          <Image
            src="/logos/cloie-logo.png"
            alt="System CLOIE Logo"
            width={32}
            height={32}
            className="rounded"
          />
          <span className="text-title-lg text-primary font-bold tracking-tight">System CLOIE</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
        <nav className="space-y-1">
          {mainNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group text-body-md flex items-center justify-between rounded-md px-3 py-2.5 font-medium transition-colors",
                  isActive
                    ? "bg-primary-soft text-primary"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    className={cn(
                      "size-5 shrink-0",
                      isActive ? "text-primary" : "text-text-muted group-hover:text-text-primary"
                    )}
                  />
                  {item.name}
                </div>
                {item.badgeCount && item.badgeCount > 0 && (
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                      isActive ? "bg-primary text-white" : "bg-primary-muted text-primary"
                    )}
                  >
                    {item.badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {secondaryNav.length > 0 && (
          <nav className="mt-8 space-y-1">
            <div className="mb-2 px-3">
              <span className="text-text-muted text-[10px] font-bold tracking-wider uppercase">
                Support
              </span>
            </div>
            {secondaryNav.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-body-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary flex items-center gap-3 rounded-md px-3 py-2 font-medium transition-colors"
              >
                <item.icon className="text-text-muted size-4 shrink-0" />
                {item.name}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <div className="border-border mt-auto border-t p-4">
        <div className="flex items-center gap-3 rounded-md px-3 py-2">
          <div className="bg-primary flex size-9 shrink-0 items-center justify-center rounded-full text-white">
            <span className="text-body-sm font-semibold">{user?.name?.[0] || "U"}</span>
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-label-md text-text-primary truncate font-semibold">
              {user?.name || "User"}
            </span>
            <span className="text-caption text-text-muted truncate">
              {user?.email || "No email provided"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
