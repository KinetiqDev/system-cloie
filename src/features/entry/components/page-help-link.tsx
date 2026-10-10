"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { CircleHelp } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/constants/roles";
import { resolveHelpUrl } from "@/features/entry/help-center-links";

interface PageHelpLinkProps {
  activeRole?: Role | null;
}

/**
 * The one page-level contextual-help action.
 *
 * Deliberately a single link per page in the topbar utility group, not a help
 * icon beside every control. The route mapping lives in
 * `help-center-links.ts`; this component only reads the current pathname and
 * renders the resolved article, so adding a page never means editing a page.
 *
 * Uses `buttonVariants` directly rather than `Button`, because `Button` renders
 * through Base UI and stamps `role="button"` onto the element. On an anchor
 * that removes link semantics and misreports navigation to assistive tech.
 *
 * Opens in a new tab so a half-finished evaluation form is never left behind.
 * `rel="noopener noreferrer"` keeps the Help Center from reaching back.
 */
export function PageHelpLink({ activeRole = null }: PageHelpLinkProps) {
  const pathname = usePathname();
  const href = React.useMemo(() => resolveHelpUrl(pathname, activeRole), [pathname, activeRole]);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        // The `sm` recipe already floors this control at 44 px on touch; what was
        // missing is weight. Below `sm` the control is icon-only, and as a
        // borderless ghost with a 14 px glyph it read as far smaller than the
        // bordered controls beside it. It takes the icon-button treatment those
        // siblings already use — a visible boundary, a surface, the elevation
        // the appearance trigger carries, and square proportions — so it reads
        // as a peer control rather than decoration. The labelled form keeps the
        // plain ghost treatment.
        "max-sm:border-border max-sm:bg-background max-sm:aspect-square max-sm:px-0 max-sm:shadow-2xs",
        "text-text-secondary hover:text-text-primary"
      )}
    >
      {/* Icon-only below `sm`: the glyph takes the 20 px icon scale the bordered
          topbar controls use, not the 14 px scale the labelled button sets. */}
      <CircleHelp aria-hidden="true" className="size-3.5 max-sm:size-5" />
      {/* Label on roomier viewports; on mobile the utility row is tight, so the
          visible label is hidden and the accessible name is kept for readers. */}
      <span className="hidden sm:inline">Help with this page</span>
      <span className="sr-only sm:hidden">Help with this page</span>
    </a>
  );
}
