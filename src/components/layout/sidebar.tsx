"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CloieLogoMark } from "@/components/brand/cloie-logo-mark";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/constants/roles";
import type { NavGroup, NavItem } from "@/lib/constants/navigation";
import {
  getDeanActiveItem,
  getDeanNavGroups,
  getDeanStandaloneNav,
  getHighestNavRole,
  getNavItemIdentity,
  getMainNavByRoles,
  getSecondaryNavByRoles,
  getDeepestMatchingNavItem,
  getDashboardHref,
} from "@/lib/constants/navigation";
import { ROLES } from "@/lib/constants/roles";
import { NavigationRow } from "./navigation-row";

// The plate keeps the navy artwork legible against the dark sidebar.
const LOGO_CLASS_NAME = "h-10";
const NAV_ID = "app-sidebar-nav";
/** A rail delay keeps labels from flickering as the pointer crosses the rail. */
const TOOLTIP_DELAY = 300;
/** Clears the rail edge so a rail tooltip never covers the icons beside it. */
const RAIL_TOOLTIP_OFFSET = 12;

/**
 * The fold.
 *
 * Collapsing occludes each label — the text is squeezed to zero width, drifts
 * toward the rail edge, and fades — while the icons settle into the rail's
 * centre. The rail width itself snaps: design.md §10 keeps layout dimensions out
 * of transitions, and a width tween would desync the fixed rail from the content
 * gutter, which moves in discrete steps. Reduced motion keeps the opacity fade
 * and drops the spatial movement.
 */
const LABEL_MOTION =
  "overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-200 ease-out motion-reduce:transition-[opacity] motion-reduce:duration-150";
const LABEL_OPEN = "max-w-[20rem] opacity-100";
const LABEL_FOLDED = "max-w-0 -translate-x-1 opacity-0";
/** Destinations arrive with the same drift the fold uses to leave. */
const ARRIVAL =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-2 motion-safe:duration-200";
/** Below lg the Dean's rail is still a rail, so it shows no names either. */
const RAIL_LABEL_HIDE_BELOW_LG = "md:hidden lg:inline";

interface RailRowProps {
  collapsed: boolean;
  /** The destination's name, repeated where the rail has no room to show it. */
  label: string;
  children: ReactElement;
}

/**
 * A rail row names itself.
 *
 * Collapsed, the row loses its visible label, so a tooltip beside it repeats the
 * accessible name (design.md §8.4). Expanded the row stands alone, and a tooltip
 * would only restate what is already on screen.
 */
function RailRow({ collapsed, label, children }: RailRowProps) {
  if (!collapsed) {
    return children;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side="right" sideOffset={RAIL_TOOLTIP_OFFSET}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

interface FoldedLabelProps {
  collapsed: boolean;
  /** The Dean's rail starts at md and only earns its labels at lg. */
  railBelowLg?: boolean;
  children: ReactNode;
}

/**
 * A destination's name, under the fold.
 *
 * Collapsed hides it at every width. Otherwise a width-driven rail hides it below
 * lg, which the caller signals with `railBelowLg`.
 */
function FoldedLabel({ collapsed, railBelowLg = false, children }: FoldedLabelProps) {
  return (
    <span
      className={cn(
        LABEL_MOTION,
        collapsed ? LABEL_FOLDED : cn(LABEL_OPEN, railBelowLg && RAIL_LABEL_HIDE_BELOW_LG)
      )}
    >
      {children}
    </span>
  );
}

interface SidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  roles?: Role[];
  activeProgramId?: string | null;
  /** Rail state: destinations resolve to icons only, for every role alike. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}
export function Sidebar({
  user,
  roles = [],
  activeProgramId = null,
  collapsed = false,
  onToggleCollapsed,
}: SidebarProps) {
  const pathname = usePathname();

  const mainNav = getMainNavByRoles(roles, pathname, activeProgramId);
  const secondaryNav = getSecondaryNavByRoles(roles);
  const activeItem = getDeepestMatchingNavItem(pathname, mainNav);
  if (getHighestNavRole(roles) === ROLES.DEAN) {
    return <DeanSidebar user={user} collapsed={collapsed} onToggleCollapsed={onToggleCollapsed} />;
  }

  return (
    <aside
      data-collapsed={collapsed ? "true" : "false"}
      className={cn(
        "border-sidebar-border bg-sidebar fixed inset-y-0 left-0 z-50 hidden flex-col overflow-hidden border-r lg:flex",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <SidebarHeader
        collapsed={collapsed}
        onToggle={onToggleCollapsed}
        href={getDashboardHref(roles, pathname, activeProgramId)}
      />

      <div className={cn("flex flex-1 flex-col overflow-y-auto py-6", collapsed ? "px-2" : "px-4")}>
        <nav id={NAV_ID} aria-label="Primary navigation" className="space-y-1">
          {mainNav.map((item) => (
            <PrimaryNavRow
              key={getNavItemIdentity(item)}
              item={item}
              active={activeItem === item}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {secondaryNav.length > 0 && (
          <nav className="mt-8 space-y-1">
            {!collapsed && (
              <div className="mb-2 px-3">
                <span className="text-sidebar-foreground/50 text-label-sm tracking-wider uppercase">
                  Support
                </span>
              </div>
            )}
            {secondaryNav.map((item) => (
              <NavigationRow
                key={item.name}
                href={item.href}
                secondary
                iconOnly={collapsed}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className="text-sidebar-foreground/50 size-4 shrink-0" />
                <FoldedLabel collapsed={collapsed}>{item.name}</FoldedLabel>
              </NavigationRow>
            ))}
          </nav>
        )}
      </div>

      <SidebarFooter user={user} collapsed={collapsed} />
    </aside>
  );
}

interface PrimaryNavRowProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}

/**
 * One primary destination.
 *
 * The icon carries the selected/inactive roles; the unread count sits at the
 * expanded row's trailing edge, or becomes a dot on the icon once the row folds.
 */
function PrimaryNavRow({ item, active, collapsed }: PrimaryNavRowProps) {
  const count = item.badgeCount && item.badgeCount > 0 ? item.badgeCount : null;

  return (
    <RailRow collapsed={collapsed} label={navLabel(item.name, count)}>
      <NavigationRow
        href={item.href}
        active={active}
        aria-current={active ? "page" : undefined}
        iconOnly={collapsed}
        className={collapsed ? undefined : "justify-between"}
      >
        <span
          className={cn(
            "flex items-center transition-[gap] duration-200 ease-out motion-reduce:transition-none",
            collapsed ? "gap-0" : "gap-3"
          )}
        >
          <PrimaryNavIcon icon={item.icon} active={active} count={count} collapsed={collapsed} />
          <FoldedLabel collapsed={collapsed}>{navLabel(item.name, count)}</FoldedLabel>
        </span>
        {!collapsed && count && (
          <span
            className={cn(
              "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 leading-none",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "bg-sidebar-accent text-sidebar-accent-foreground",
              "text-label-sm"
            )}
          >
            {count}
          </span>
        )}
      </NavigationRow>
    </RailRow>
  );
}

interface PrimaryNavIconProps {
  icon: NavItem["icon"];
  active: boolean;
  /** Folded, the count rides the icon as a dot because the pill has no room. */
  count: number | null;
  collapsed: boolean;
}

function PrimaryNavIcon({ icon: Icon, active, count, collapsed }: PrimaryNavIconProps) {
  return (
    <span className="relative flex shrink-0 items-center justify-center">
      <Icon
        className={cn(
          "size-5",
          active
            ? "text-sidebar-accent-foreground"
            : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
        )}
        aria-hidden="true"
      />
      {collapsed && count && (
        <span
          aria-hidden="true"
          className="bg-sidebar-primary absolute -top-1 -right-1 size-2 rounded-full"
        />
      )}
    </span>
  );
}

interface DeanNavRowProps {
  item: Pick<NavGroup, "name" | "href" | "icon">;
  active: boolean;
  collapsed: boolean;
  /** A section's children sit under their heading, in the compact type scale. */
  nested?: boolean;
  /** A section heading keeps the rail's standard inset; a destination sits flush. */
  section?: boolean;
}

/**
 * A Dean destination, at either level of the rail.
 *
 * Collapsed hides labels at every width. Otherwise the tablet rail hides them
 * below lg through the label's own breakpoint classes.
 */
function DeanNavRow({ item, active, collapsed, nested = false, section = false }: DeanNavRowProps) {
  const rail = !collapsed;

  return (
    <RailRow collapsed={collapsed} label={item.name}>
      <NavigationRow
        href={item.href}
        active={active}
        rail={rail}
        iconOnly={collapsed}
        aria-current={active ? "page" : undefined}
        title={rail ? item.name : undefined}
        className={cn(nested && "text-body-sm", collapsed && !section && "px-0")}
      >
        <item.icon className={cn("shrink-0", nested ? "size-4" : "size-5")} aria-hidden="true" />
        <FoldedLabel collapsed={collapsed} railBelowLg>
          {item.name}
        </FoldedLabel>
      </NavigationRow>
    </RailRow>
  );
}

interface DeanNavGroupProps {
  group: NavGroup;
  /** Resolved once, then read by the section and each of its children. */
  activeItem: (NavItem | NavGroup) | null;
  collapsed: boolean;
}

/** One Dean section: a heading that is itself a destination, plus its children. */
function DeanNavGroup({ group, activeItem, collapsed }: DeanNavGroupProps) {
  // A section and its destinations can share an href, so both have to match.
  const active = activeItem?.href === group.href && activeItem.name === group.name;

  return (
    <div>
      <DeanNavRow item={group} active={active} collapsed={collapsed} section />
      <div
        className={cn(
          "border-sidebar-border mt-1 hidden gap-1 border-l pl-2 md:flex md:flex-col",
          collapsed ? "ml-3" : "ml-4"
        )}
      >
        {group.items.map((item) => (
          <DeanNavRow
            key={item.href}
            item={item}
            active={activeItem === item}
            collapsed={collapsed}
            nested
          />
        ))}
      </div>
    </div>
  );
}

function DeanSidebar({
  user,
  collapsed = false,
  onToggleCollapsed,
}: Pick<SidebarProps, "user" | "collapsed" | "onToggleCollapsed">) {
  const pathname = usePathname();
  const activeItem = getDeanActiveItem(pathname);
  const groups = getDeanNavGroups();
  const [dashboard, profile] = getDeanStandaloneNav();
  const rail = !collapsed;

  return (
    <aside
      data-collapsed={collapsed ? "true" : "false"}
      className={cn(
        "border-sidebar-border bg-sidebar fixed inset-y-0 left-0 z-50 hidden flex-col overflow-hidden border-r md:flex",
        collapsed ? "w-16" : "w-16 lg:w-64"
      )}
    >
      <SidebarHeader
        collapsed={collapsed}
        onToggle={onToggleCollapsed}
        href={dashboard.href}
        // The Dean rail starts at md, so the wordmark and the toggle wait for lg.
        railBelowLg
      />
      <nav
        id={NAV_ID}
        className={cn("flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-6", rail && "lg:px-4")}
        aria-label="Dean navigation"
      >
        <DeanNavRow item={dashboard} active={activeItem === dashboard} collapsed={collapsed} />
        {groups.map((group) => (
          <DeanNavGroup
            key={group.href}
            group={group}
            activeItem={activeItem}
            collapsed={collapsed}
          />
        ))}
        <DeanNavRow item={profile} active={activeItem === profile} collapsed={collapsed} />
      </nav>
      <SidebarFooter user={user} collapsed={collapsed} />
    </aside>
  );
}

interface SidebarHeaderProps {
  collapsed: boolean;
  onToggle?: () => void;
  href: string;
  /** The Dean rail starts at md, so the wordmark and toggle wait for lg. */
  railBelowLg?: boolean;
}

/**
 * Brand lockup plus the collapse control.
 *
 * Expanded, the toggle closes the sidebar from the header's trailing edge. A
 * rail has no room for a second control beside the mark, so there the mark
 * itself carries the expand affordance and the brand destination stays one row
 * away in the list.
 */
function SidebarHeader({ collapsed, onToggle, href, railBelowLg = false }: SidebarHeaderProps) {
  if (collapsed) {
    return (
      <div className="border-sidebar-border flex h-16 shrink-0 items-center justify-center border-b px-2">
        <TooltipProvider delay={TOOLTIP_DELAY}>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  aria-label="Expand navigation sidebar"
                  aria-expanded={false}
                  aria-controls={NAV_ID}
                  className={cn(
                    "text-sidebar-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                    "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150"
                  )}
                >
                  <CloieLogoMark className="h-8" />
                </Button>
              }
            />
            <TooltipContent side="right" sideOffset={RAIL_TOOLTIP_OFFSET}>
              Expand sidebar
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-sidebar-border flex h-16 shrink-0 items-center border-b",
        railBelowLg ? "justify-center px-3 lg:justify-start lg:px-6" : "px-6"
      )}
    >
      <Link
        href={href}
        aria-label="System CLOIE — Dashboard"
        className="focus-visible:outline-ring flex items-center gap-3 rounded-md transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <CloieLogoMark className={LOGO_CLASS_NAME} />
        <span
          className={cn(
            "text-link text-title-lg font-bold tracking-tight",
            railBelowLg && "hidden lg:inline",
            ARRIVAL
          )}
        >
          System CLOIE
        </span>
      </Link>
      <TooltipProvider delay={TOOLTIP_DELAY}>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onToggle}
                aria-label="Collapse navigation sidebar"
                aria-controls={NAV_ID}
                aria-expanded
                className={cn(
                  "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground ml-auto",
                  railBelowLg ? "hidden lg:flex" : "flex",
                  ARRIVAL
                )}
              >
                <PanelLeftClose aria-hidden="true" />
              </Button>
            }
          />
          <TooltipContent side="bottom" sideOffset={8}>
            Collapse sidebar
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function SidebarFooter({ user, collapsed }: { user?: SidebarProps["user"]; collapsed: boolean }) {
  return (
    <div className={cn("border-sidebar-border mt-auto border-t", collapsed ? "p-2" : "p-4")}>
      <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "px-3 py-2")}>
        <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
          <span className="text-body-sm font-semibold">{user?.name?.[0] || "U"}</span>
        </div>
        {!collapsed && <SidebarIdentity user={user} />}
      </div>
    </div>
  );
}

/** The expanded footer's identity block; the rail keeps only the monogram. */
function SidebarIdentity({ user }: { user?: SidebarProps["user"] }) {
  return (
    <div className="flex flex-col overflow-hidden">
      <span className="text-label-md text-sidebar-foreground truncate font-semibold">
        {user?.name || "User"}
      </span>
      <span className="text-caption text-sidebar-foreground/60 truncate">
        {user?.email || "No email provided"}
      </span>
    </div>
  );
}

/** Rail rows lose their visible label, so the count moves into the name. */
function navLabel(name: string, count: number | null): string {
  return count ? `${name} (${count})` : name;
}
