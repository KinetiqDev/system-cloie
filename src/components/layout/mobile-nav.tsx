"use client";

import { usePathname } from "next/navigation";
import type { Role } from "@/lib/constants/roles";
import {
  getHighestNavRole,
  getNavItemIdentity,
  getDeanPrimaryNav,
  getMobileNavByRoles,
  getDeepestMatchingNavItem,
} from "@/lib/constants/navigation";
import { ROLES } from "@/lib/constants/roles";
import { BottomNavRow } from "./navigation-row";

interface MobileNavProps {
  roles?: Role[];
}

export function MobileNav({ roles = [] }: MobileNavProps) {
  const pathname = usePathname();

  const mainNav =
    getHighestNavRole(roles) === ROLES.DEAN
      ? getDeanPrimaryNav()
      : getMobileNavByRoles(roles, pathname);
  const activeItem = getDeepestMatchingNavItem(pathname, mainNav);

  return (
    <nav className="border-sidebar-border bg-sidebar pb-safe fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-between border-t px-2 md:hidden" aria-label="Primary navigation">
      {mainNav.map((item) => {
        const isActive = activeItem === item;
        return (
          <BottomNavRow
            key={getNavItemIdentity(item)}
            href={item.href}
            active={isActive}
            aria-current={isActive ? "page" : undefined}
          >
            <item.icon className="size-6" aria-hidden="true" />
            <span className="text-label-sm block max-w-full truncate leading-none">
              {item.name}
            </span>
          </BottomNavRow>
        );
      })}
    </nav>
  );
}
