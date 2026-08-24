import Link from "next/link";
import { Fragment } from "react";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

function BreadcrumbSegment({
  item,
  isLast,
}: {
  item: BreadcrumbItem;
  isLast: boolean;
}) {
  return item.href && !isLast ? (
    <Link
      href={item.href}
      className="text-muted-foreground hover:text-foreground max-w-40 truncate rounded-sm transition-colors sm:max-w-56 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {item.label}
    </Link>
  ) : (
    <span
      aria-current={isLast ? "page" : undefined}
      className="text-foreground max-w-40 truncate sm:max-w-56"
    >
      {item.label}
    </span>
  );
}

/**
 * Responsive breadcrumb trail (spec §12). On narrow screens the middle steps
 * collapse behind an ellipsis (hidden from assistive tech) while the first
 * and last steps remain visible; the collapsed labels are enumerated in
 * screen-reader-only text so the hierarchy stays recoverable. The trailing
 * item is the current page and never a link. Upward links are plain hrefs so
 * the page owns URL-state preservation.
 */
export function Breadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  const showEllipsis = items.length > 3;
  const lastIndex = items.length - 1;
  const collapsedLabels = showEllipsis
    ? items.slice(1, lastIndex).map((i) => i.label).join(", ")
    : "";

  return (
    <nav aria-label="Breadcrumbs" className={cn("text-label-sm", className)}>
      <ol className="flex min-w-0 items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === lastIndex;
          const isMiddle = index > 0 && index < lastIndex;
          const hiddenOnMobile = showEllipsis && isMiddle;
          const separator =
            index === 0 ? null : (
              <li aria-hidden="true" className={cn("flex items-center", hiddenOnMobile && "hidden md:flex")}>
                <ChevronRight
                  aria-hidden="true"
                  className="text-muted-foreground size-3.5 shrink-0"
                />
              </li>
            );
          return (
            <Fragment key={item.label}>
              {separator}
              <li
                className={cn(
                  "flex min-w-0 items-center",
                  hiddenOnMobile && "hidden md:flex"
                )}
              >
                <BreadcrumbSegment item={item} isLast={isLast} />
              </li>
              {showEllipsis && isMiddle && index === 1 && (
                <li aria-hidden="true" className="flex items-center md:hidden">
                  <MoreHorizontal className="text-muted-foreground size-4" />
                  <span className="sr-only">Collapsed breadcrumb steps: {collapsedLabels}</span>
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
