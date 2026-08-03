"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/constants/roles";
import {
  getHighestNavRole,
  getDeanPrimaryNav,
  getMobileNavByRoles,
  getDeepestMatchingNavItem,
} from "@/lib/constants/navigation";
import { ROLES } from "@/lib/constants/roles";
import { NavigationLink } from "./navigation-link";

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
    <nav className="border-border bg-surface pb-safe fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-between border-t px-2 md:hidden" aria-label="Primary navigation">
      {mainNav.map((item) => {
        const isActive = activeItem === item;
        return (
          <NavigationLink
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              isActive ? "text-primary" : "text-text-muted hover:text-text-primary"
            )}
          >
            <item.icon className={cn("size-6", isActive && "text-primary")} />
            <span
              className={cn(
                "text-[10px] leading-none font-medium",
                isActive ? "text-primary" : "text-text-muted"
              )}
            >
              {item.name}
            </span>
          </NavigationLink>
        );
      })}
    </nav>
  );
}
