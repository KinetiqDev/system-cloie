"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { Role } from "@/lib/constants/roles";
import { sidebarCollapsedCookieHeader } from "@/lib/preferences/sidebar-preference";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { FOLD_MOTION } from "./sidebar-fold";

interface SidebarShellProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  roles: Role[];
  activeProgramId: string | null;
  /** The Dean keeps a tablet-width icon rail between md and lg. */
  isDean: boolean;
  /** Server-resolved cookie value, so the first paint already matches. */
  defaultCollapsed: boolean;
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Binds the desktop sidebar's collapse state to the content column's offset.
 *
 * The sidebar is fixed, so collapsing it has to move the content column with
 * it. Owning both here keeps the rail width and the page gutter from drifting,
 * and the toggle persists the operator's choice for the next server render.
 */
export function SidebarShell({
  user,
  roles,
  activeProgramId,
  isDean,
  defaultCollapsed,
  header,
  footer,
  children,
}: SidebarShellProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const toggleCollapsed = useCallback(() => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = sidebarCollapsedCookieHeader(next);
  }, [collapsed]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || !(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() !== "b") return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      if (target && /^(input|select|textarea)$/i.test(target.tagName)) return;
      event.preventDefault();
      toggleCollapsed();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleCollapsed]);

  const contentOffset = collapsed ? "lg:pl-16" : isDean ? "md:pl-16 lg:pl-64" : "lg:pl-64";

  return (
    <>
      <Sidebar
        user={user}
        roles={roles}
        activeProgramId={activeProgramId}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />
      <div className={cn("flex min-w-0 flex-1 flex-col", FOLD_MOTION, contentOffset)}>
        {header}
        {children}
        {footer}
      </div>
    </>
  );
}
