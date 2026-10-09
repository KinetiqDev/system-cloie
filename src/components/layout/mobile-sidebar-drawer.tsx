"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CloieLogoMark } from "@/components/brand/cloie-logo-mark";
import type { Role } from "@/lib/constants/roles";
import type { LucideIcon } from "lucide-react";
import {
  getDeanNavGroups,
  getDeanStandaloneNav,
  getHighestNavRole,
  getNavItemIdentity,
  getMainNavByRoles,
  getDeanActiveItem,
  getDeepestMatchingNavItem,
  getDashboardHref,
} from "@/lib/constants/navigation";
import { ROLES } from "@/lib/constants/roles";
import { NavigationRow } from "./navigation-row";

/**
 * Drawer slide timing. A confident deceleration curve that mirrors the desktop
 * sidebar fold (sidebar-fold.ts) while staying a touch faster for the snappier
 * mobile interaction.
 */
const DRAWER_DURATION_MS = 280;
const DRAWER_EASING = "cubic-bezier(0.32, 0.72, 0, 1)";

interface MobileSidebarDrawerProps {
  roles?: Role[];
  user?: { name?: string | null; email?: string | null };
  activeProgramId?: string | null;
}

/**
 * Manages the three-phase lifecycle that lets the drawer animate out before
 * being removed from the accessibility tree:
 *
 *   closed  → mounting (DOM present, start entrance)  → open
 *   open    → closing  (run exit transition)           → closed
 *
 * While `closing`, the drawer remains mounted so CSS transitions run against a
 * real element, but `aria-hidden` removes it from the accessibility tree
 * immediately so screen readers never read stale content.
 */
type DrawerPhase = "closed" | "mounting" | "open" | "closing";

export function MobileSidebarDrawer({
  roles = [],
  user,
  activeProgramId = null,
}: MobileSidebarDrawerProps) {
  const [phase, setPhase] = useState<DrawerPhase>("closed");
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const dean = getHighestNavRole(roles) === ROLES.DEAN;
  const mainNav = getMainNavByRoles(roles, pathname, activeProgramId);
  const activeItem = dean
    ? getDeanActiveItem(pathname)
    : getDeepestMatchingNavItem(pathname, mainNav);
  const restoreFocusRef = useRef(true);

  const mounted = phase !== "closed";
  const visible = phase === "open";

  // Phase: mounting → open (after one frame, so the browser paints the
  // off-screen position and the transition has somewhere to animate from).
  useEffect(() => {
    if (phase !== "mounting") return;
    const frame = requestAnimationFrame(() => setPhase("open"));
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  // Phase: closing → closed (after the exit transition finishes).
  useEffect(() => {
    if (phase !== "closing") return;
    const timeout = setTimeout(() => setPhase("closed"), DRAWER_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [phase]);

  // Focus management + scroll lock, active only while the drawer is interactive.
  useEffect(() => {
    if (phase !== "open") return;
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
        setPhase("closing");
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
  }, [phase]);

  const open = useCallback(() => setPhase("mounting"), []);
  const close = useCallback((restoreFocus = true) => {
    restoreFocusRef.current = restoreFocus;
    setPhase("closing");
  }, []);

  const renderLink = (item: { name: string; href: string; icon: LucideIcon }) => {
    const active = activeItem === item;
    return (
      <NavigationRow
        key={getNavItemIdentity(item)}
        href={item.href}
        onClick={() => close(false)}
        active={active}
        aria-current={active ? "page" : undefined}
      >
        <item.icon className="size-5 shrink-0" aria-hidden="true" />
        {item.name}
      </NavigationRow>
    );
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={open}
        className={cn(
          "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground focus-visible:outline-ring flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors focus-visible:outline-2",
          dean ? "md:hidden" : "lg:hidden"
        )}
        aria-label="Open navigation menu"
        aria-expanded={visible}
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>
      {mounted && (
        <div
          className={cn(
            "fixed inset-0 z-50",
            dean ? "md:hidden" : "lg:hidden",
            "bg-scrim transition-opacity motion-reduce:transition-none"
          )}
          style={{
            transitionDuration: `${DRAWER_DURATION_MS}ms`,
            opacity: visible ? 1 : 0,
          }}
          onClick={() => close()}
          aria-hidden="true"
        />
      )}
      {mounted && (
        <aside
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          aria-hidden={!visible}
          className={cn(
            "bg-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(22rem,88vw)] flex-col shadow-xl",
            dean ? "md:hidden" : "lg:hidden",
            "transition-transform motion-reduce:transition-none"
          )}
          style={{
            transitionDuration: `${DRAWER_DURATION_MS}ms`,
            transitionTimingFunction: DRAWER_EASING,
            transform: visible ? "translateX(0)" : "translateX(-100%)",
          }}
        >
          <div className="border-sidebar-border flex min-h-16 shrink-0 items-center justify-between border-b px-5">
            <Link
              href={getDashboardHref(roles, pathname, activeProgramId)}
              onClick={() => close(false)}
              aria-label="System CLOIE — Dashboard"
              className="focus-visible:outline-ring flex items-center gap-3 rounded-md transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <CloieLogoMark className="h-10" />
              <span className="text-title-md text-link font-bold tracking-tight">System CLOIE</span>
            </Link>
            <button
              type="button"
              onClick={() => close()}
              className="text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground focus-visible:outline-ring flex min-h-11 min-w-11 items-center justify-center rounded-md focus-visible:outline-2"
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
                  const active = activeItem?.href === group.href && activeItem.name === group.name;
                  return (
                    <div key={group.href}>
                      <NavigationRow
                        href={group.href}
                        onClick={() => close(false)}
                        active={active}
                        aria-current={active ? "page" : undefined}
                      >
                        <group.icon className="size-5" aria-hidden="true" />
                        {group.name}
                      </NavigationRow>
                      <div className="border-sidebar-border mt-1 ml-4 flex flex-col gap-1 border-l pl-2">
                        {group.items.map(renderLink)}
                      </div>
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
            <div className="border-sidebar-border border-t p-4">
              <div className="text-body-sm text-sidebar-foreground font-semibold">
                {user.name || "User"}
              </div>
              <div className="text-caption text-sidebar-foreground/60 truncate">
                {user.email || ""}
              </div>
            </div>
          )}
        </aside>
      )}
    </>
  );
}
