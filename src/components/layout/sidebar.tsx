"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/constants/roles";
import {
  getDeanActiveGroup,
  getDeanNavGroups,
  getDeanStandaloneNav,
  getHighestNavRole,
  getMainNavByRoles,
  getSecondaryNavByRoles,
  getDeepestMatchingNavItem,
  getDeanActiveItem,
} from "@/lib/constants/navigation";
import { ROLES } from "@/lib/constants/roles";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { NavigationLink } from "./navigation-link";

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
  const activeItem = getDeepestMatchingNavItem(pathname, mainNav);

  if (getHighestNavRole(roles) === ROLES.DEAN) {
    return <DeanSidebar user={user} />;
  }

  return (
    <aside className="border-border bg-surface fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r lg:flex">
      <div className="border-border flex h-16 shrink-0 items-center border-b px-6">
        <div className="flex items-center gap-3">
          <Image
            src="/logos/cloie-logo.png"
            alt="System CLOIE Logo"
            width={486}
            height={513}
            className="h-8 w-auto rounded"
          />
          <span className="text-title-lg text-primary font-bold tracking-tight">System CLOIE</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
        <nav className="space-y-1">
          {mainNav.map((item) => {
            const isActive = activeItem?.href === item.href;
            return (
              <NavigationLink
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
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
              </NavigationLink>
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
              <NavigationLink
                key={item.name}
                href={item.href}
                className="text-body-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary flex items-center gap-3 rounded-md px-3 py-2 font-medium transition-colors"
              >
                <item.icon className="text-text-muted size-4 shrink-0" />
                {item.name}
              </NavigationLink>
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

function DeanSidebar({ user }: Pick<SidebarProps, "user">) {
  const pathname = usePathname();
  const activeGroup = getDeanActiveGroup(pathname);
  const activeItem = getDeanActiveItem(pathname);
  const groups = getDeanNavGroups();
  const [dashboard, profile] = getDeanStandaloneNav();
  const [openGroup, setOpenGroup] = useState<{ href: string; pathname: string } | null>(null);

  const renderLink = (item: typeof dashboard, compact = false) => {
    const active = activeItem === item;
    return (
      <NavigationLink
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        title={compact ? item.name : undefined}
        className={cn(
          "group flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:min-w-11",
          compact ? "justify-center lg:justify-start" : "",
          active ? "bg-primary-soft text-primary" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        )}
      >
        <item.icon className="size-5 shrink-0" aria-hidden="true" />
        <span className={cn(compact && "md:hidden lg:inline")}>{item.name}</span>
      </NavigationLink>
    );
  };

  return (
    <aside className="border-border bg-surface fixed inset-y-0 left-0 z-50 hidden w-16 flex-col border-r md:flex lg:w-64">
      <div className="border-border flex h-16 shrink-0 items-center justify-center border-b px-3 lg:justify-start lg:px-6">
        <Image src="/logos/cloie-logo.png" alt="System CLOIE Logo" width={486} height={513} className="h-8 w-auto rounded" />
        <span className="text-title-lg text-primary ml-3 hidden font-bold tracking-tight lg:inline">System CLOIE</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-6 lg:px-4" aria-label="Dean navigation">
        {renderLink(dashboard, true)}
          {groups.map((group) => {
            const active = activeItem?.href === group.href && activeItem.name === group.name;
            const expanded =
              activeGroup?.href === group.href ||
              (openGroup?.href === group.href && openGroup.pathname === pathname);
            return (
              <div key={group.href}>
                <div className="flex items-center gap-1">
                  <NavigationLink href={group.href} aria-current={active ? "page" : undefined} title={group.name} className={cn("flex min-h-11 flex-1 items-center gap-3 rounded-md px-3 py-2.5 font-medium focus-visible:outline-2 focus-visible:outline-ring md:min-w-11", active ? "bg-primary-soft text-primary" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary")}>
                    <group.icon className="size-5 shrink-0" aria-hidden="true" /><span className="md:hidden lg:inline">{group.name}</span>
                  </NavigationLink>
                  <button type="button" aria-label={`${expanded ? "Collapse" : "Expand"} ${group.name}`} aria-expanded={expanded} disabled={activeGroup !== null} onClick={() => setOpenGroup(expanded ? null : { href: group.href, pathname })} className="hidden min-h-11 min-w-11 items-center justify-center rounded-md text-text-muted hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-ring md:flex lg:min-w-11">
                    <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
                  </button>
                </div>
                {expanded && <div className="mt-1 ml-4 hidden gap-1 border-l border-border pl-2 md:flex md:flex-col">{group.items.map((item) => renderLink(item, true))}</div>}
            </div>
          );
        })}
        {renderLink(profile, true)}
      </nav>
      <div className="border-border border-t p-4"><div className="flex items-center gap-3"><div className="bg-primary flex size-9 shrink-0 items-center justify-center rounded-full text-white"><span className="text-body-sm font-semibold">{user?.name?.[0] || "U"}</span></div><div className="hidden min-w-0 flex-col overflow-hidden lg:flex"><span className="text-label-md text-text-primary truncate font-semibold">{user?.name || "User"}</span><span className="text-caption text-text-muted truncate">{user?.email || "No email provided"}</span></div></div></div>
    </aside>
  );
}
