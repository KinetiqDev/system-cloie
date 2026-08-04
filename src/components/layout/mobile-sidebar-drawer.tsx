"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/constants/roles";
import type { LucideIcon } from "lucide-react";
import {
  getDeanActiveGroup,
  getDeanNavGroups,
  getDeanStandaloneNav,
  getHighestNavRole,
  getMainNavByRoles,
  getDeanActiveItem,
  getDeepestMatchingNavItem,
} from "@/lib/constants/navigation";
import { ROLES } from "@/lib/constants/roles";
import { NavigationLink } from "./navigation-link";

interface MobileSidebarDrawerProps {
  roles?: Role[];
  user?: { name?: string | null; email?: string | null };
}

export function MobileSidebarDrawer({ roles = [], user }: MobileSidebarDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const dean = getHighestNavRole(roles) === ROLES.DEAN;
  const activeGroup = dean ? getDeanActiveGroup(pathname) : null;
  const mainNav = getMainNavByRoles(roles, pathname);
  const activeItem = dean
    ? getDeanActiveItem(pathname)
    : getDeepestMatchingNavItem(pathname, mainNav);
  const restoreFocusRef = useRef(true);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    const focusableSelector =
      "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
    const firstNavigationLink = drawerRef.current?.querySelector<HTMLElement>("nav a[href]");
    (
      firstNavigationLink ??
      drawerRef.current?.querySelector<HTMLElement>("button[aria-label='Close navigation menu']")
    )?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        restoreFocusRef.current = true;
        setIsOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(focusableSelector)
      );
      const closeButton = drawerRef.current.querySelector<HTMLElement>(
        "button[aria-label='Close navigation menu']"
      );
      const orderedFocusable = closeButton
        ? [closeButton, ...focusable.filter((element) => element !== closeButton)]
        : focusable;
      const activeIndex = orderedFocusable.indexOf(document.activeElement as HTMLElement);
      if (activeIndex === -1 || orderedFocusable.length === 0) return;
      const nextIndex = event.shiftKey
        ? (activeIndex - 1 + orderedFocusable.length) % orderedFocusable.length
        : (activeIndex + 1) % orderedFocusable.length;
      const next = orderedFocusable[nextIndex];
      if (!next) return;
      const isBackwardBoundary = event.shiftKey && activeIndex === 0;
      const isForwardBoundary = !event.shiftKey && activeIndex === orderedFocusable.length - 1;
      if (isBackwardBoundary || isForwardBoundary) {
        event.preventDefault();
        next.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      if (restoreFocusRef.current) trigger?.focus();
    };
  }, [isOpen]);

  const close = (restoreFocus = true) => {
    restoreFocusRef.current = restoreFocus;
    setIsOpen(false);
  };
  const renderLink = (item: { name: string; href: string; icon: LucideIcon }) => {
    const active = activeItem === item;
    return (
      <NavigationLink
        key={item.href}
        href={item.href}
        onClick={() => close(false)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "focus-visible:outline-ring flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 font-medium focus-visible:outline-2",
          active
            ? "bg-primary-soft text-primary"
            : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        )}
      >
        <item.icon className="size-5 shrink-0" aria-hidden="true" />
        {item.name}
      </NavigationLink>
    );
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "text-text-muted hover:bg-surface-muted hover:text-text-primary focus-visible:outline-ring flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors focus-visible:outline-2",
          dean ? "md:hidden" : "lg:hidden"
        )}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>
      {isOpen && (
        <div
          className={cn("fixed inset-0 z-50 bg-black/50", dean ? "md:hidden" : "lg:hidden")}
          onClick={() => close()}
          aria-hidden="true"
        />
      )}
      {isOpen && (
        <aside
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className={cn(
            "bg-surface fixed inset-y-0 left-0 z-50 flex w-[min(22rem,88vw)] flex-col shadow-xl",
            dean ? "md:hidden" : "lg:hidden"
          )}
        >
          <div className="border-border flex min-h-16 shrink-0 items-center justify-between border-b px-5">
            <div className="flex items-center gap-3">
              <Image
                src="/logos/cloie-logo.png"
                alt="System CLOIE Logo"
                width={486}
                height={513}
                className="h-7 w-auto rounded"
              />
              <span className="text-title-md text-primary font-bold tracking-tight">
                System CLOIE
              </span>
            </div>
            <button
              type="button"
              onClick={() => close()}
              className="text-text-muted hover:bg-surface-muted focus-visible:outline-ring flex min-h-11 min-w-11 items-center justify-center rounded-md focus-visible:outline-2"
              aria-label="Close navigation menu"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-4 py-6" aria-label="Expanded navigation">
            {dean ? (
              <div className="flex flex-col gap-1">
                {renderLink(getDeanStandaloneNav()[0])}
                {getDeanNavGroups().map((group) => {
                  const expanded = activeGroup?.href === group.href;
                  const active = activeItem?.href === group.href && activeItem.name === group.name;
                  return (
                    <div key={group.href}>
                      <NavigationLink
                        href={group.href}
                        onClick={() => close(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 font-medium",
                          active
                            ? "bg-primary-soft text-primary"
                            : "text-text-secondary hover:bg-surface-hover"
                        )}
                      >
                        <group.icon className="size-5" aria-hidden="true" />
                        {group.name}
                      </NavigationLink>
                      {expanded && (
                        <div className="border-border mt-1 ml-4 flex flex-col gap-1 border-l pl-2">
                          {group.items.map(renderLink)}
                        </div>
                      )}
                    </div>
                  );
                })}
                {renderLink(getDeanStandaloneNav()[1])}
              </div>
            ) : (
              <div className="flex flex-col gap-1">{mainNav.map((item) => renderLink(item))}</div>
            )}
          </nav>
          {user && (
            <div className="border-border border-t p-4">
              <div className="text-body-sm font-semibold">{user.name || "User"}</div>
              <div className="text-caption text-text-muted truncate">{user.email || ""}</div>
            </div>
          )}
        </aside>
      )}
    </>
  );
}
