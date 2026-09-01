"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/constants/roles";
import {
  getDeanActiveGroup,
  getDeanNavGroups,
  getDeanStandaloneNav,
  getHighestNavRole,
  getNavItemIdentity,
  getMainNavByRoles,
  getSecondaryNavByRoles,
  getDeepestMatchingNavItem,
  getDashboardHref,
  getDeanActiveItem,
} from "@/lib/constants/navigation";
import { ROLES } from "@/lib/constants/roles";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { NavigationRow } from "./navigation-row";

const LOGO_CLASS_NAME = "h-8 w-auto rounded border border-border bg-white p-1";

interface SidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  roles?: Role[];
  activeProgramId?: string | null;
}
export function Sidebar({ user, roles = [], activeProgramId = null }: SidebarProps) {
  const pathname = usePathname();

  const mainNav = getMainNavByRoles(roles, pathname, activeProgramId);
  const secondaryNav = getSecondaryNavByRoles(roles);
  const activeItem = getDeepestMatchingNavItem(pathname, mainNav);
  if (getHighestNavRole(roles) === ROLES.DEAN) {
    return <DeanSidebar user={user} />;
  }

  return (
    <aside className="border-sidebar-border bg-sidebar fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r lg:flex">
      <div className="border-sidebar-border flex h-16 shrink-0 items-center border-b px-6">
        <Link
          href={getDashboardHref(roles, pathname, activeProgramId)}
          aria-label="System CLOIE — Dashboard"
          className="focus-visible:outline-ring flex items-center gap-3 rounded-md transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Image
            src="/logos/cloie-logo.png"
            alt="System CLOIE Logo"
            width={486}
            height={513}
            className={LOGO_CLASS_NAME}
          />
          <span className="text-title-lg text-link font-bold tracking-tight">System CLOIE</span>
        </Link>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
        <nav aria-label="Primary navigation" className="space-y-1">
          {mainNav.map((item) => {
            const isActive = activeItem === item;
            return (
              <NavigationRow
                key={getNavItemIdentity(item)}
                href={item.href}
                active={isActive}
                aria-current={isActive ? "page" : undefined}
                className="justify-between"
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    className={cn(
                      "size-5 shrink-0",
                      isActive
                        ? "text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
                    )}
                  />
                  {item.name}
                </div>
                {item.badgeCount && item.badgeCount > 0 && (
                  <span
                    className={cn(
                      "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 leading-none",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "bg-sidebar-accent text-sidebar-accent-foreground",
                      "text-label-sm"
                    )}
                  >
                    {item.badgeCount}
                  </span>
                )}
              </NavigationRow>
            );
          })}
        </nav>

        {secondaryNav.length > 0 && (
          <nav className="mt-8 space-y-1">
            <div className="mb-2 px-3">
              <span className="text-sidebar-foreground/50 text-label-sm tracking-wider uppercase">
                Support
              </span>
            </div>
            {secondaryNav.map((item) => (
              <NavigationRow key={item.name} href={item.href} secondary>
                <item.icon className="text-sidebar-foreground/50 size-4 shrink-0" />
                {item.name}
              </NavigationRow>
            ))}
          </nav>
        )}
      </div>

      <div className="border-sidebar-border mt-auto border-t p-4">
        <div className="flex items-center gap-3 rounded-md px-3 py-2">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
            <span className="text-body-sm font-semibold">{user?.name?.[0] || "U"}</span>
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-label-md text-sidebar-foreground truncate font-semibold">
              {user?.name || "User"}
            </span>
            <span className="text-caption text-sidebar-foreground/60 truncate">
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
      <NavigationRow
        key={item.href}
        href={item.href}
        active={active}
        rail={compact}
        aria-current={active ? "page" : undefined}
        title={compact ? item.name : undefined}
      >
        <item.icon className="size-5 shrink-0" aria-hidden="true" />
        <span className={cn(compact && "md:hidden lg:inline")}>{item.name}</span>
      </NavigationRow>
    );
  };

  return (
    <aside className="border-sidebar-border bg-sidebar fixed inset-y-0 left-0 z-50 hidden w-16 flex-col border-r md:flex lg:w-64">
      <div className="border-sidebar-border flex h-16 shrink-0 items-center justify-center border-b px-3 lg:justify-start lg:px-6">
        <Link
          href={dashboard.href}
          aria-label="System CLOIE — Dashboard"
          className="focus-visible:outline-ring flex items-center gap-3 rounded-md transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Image
            src="/logos/cloie-logo.png"
            alt="System CLOIE Logo"
            width={486}
            height={513}
            className={LOGO_CLASS_NAME}
          />
          <span className="text-title-lg text-link ml-3 hidden font-bold tracking-tight lg:inline">
            System CLOIE
          </span>
        </Link>
      </div>
      <nav
        className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-6 lg:px-4"
        aria-label="Dean navigation"
      >
        {renderLink(dashboard, true)}
        {groups.map((group) => {
          const active = activeItem?.href === group.href && activeItem.name === group.name;
          const expanded =
            activeGroup?.href === group.href ||
            (openGroup?.href === group.href && openGroup.pathname === pathname);
          return (
            <div key={group.href}>
              <div className="flex items-center gap-1">
                <NavigationRow
                  href={group.href}
                  active={active}
                  rail
                  aria-current={active ? "page" : undefined}
                  title={group.name}
                  className="flex-1"
                >
                  <group.icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className="md:hidden lg:inline">{group.name}</span>
                </NavigationRow>
                <button
                  type="button"
                  aria-label={`${expanded ? "Collapse" : "Expand"} ${group.name}`}
                  aria-expanded={expanded}
                  disabled={activeGroup !== null}
                  onClick={() => setOpenGroup(expanded ? null : { href: group.href, pathname })}
                  className="text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground focus-visible:outline-ring hidden min-h-11 min-w-11 items-center justify-center rounded-md focus-visible:outline-2 md:flex lg:min-w-11"
                >
                  <ChevronDown
                    className={cn("size-4 transition-transform", expanded && "rotate-180")}
                    aria-hidden="true"
                  />
                </button>
              </div>
              {expanded && (
                <div className="border-sidebar-border mt-1 ml-4 hidden gap-1 border-l pl-2 md:flex md:flex-col">
                  {group.items.map((item) => renderLink(item, true))}
                </div>
              )}
            </div>
          );
        })}
        {renderLink(profile, true)}
      </nav>
      <div className="border-sidebar-border border-t p-4">
        <div className="flex items-center gap-3">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
            <span className="text-body-sm font-semibold">{user?.name?.[0] || "U"}</span>
          </div>
          <div className="hidden min-w-0 flex-col overflow-hidden lg:flex">
            <span className="text-label-md text-sidebar-foreground truncate font-semibold">
              {user?.name || "User"}
            </span>
            <span className="text-caption text-sidebar-foreground/60 truncate">
              {user?.email || "No email provided"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
