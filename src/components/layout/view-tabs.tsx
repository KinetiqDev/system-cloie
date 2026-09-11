import { NavigationLink } from "@/components/layout/navigation-link";
import { cn } from "@/lib/utils";
import { tabsListVariants, tabsTriggerClass } from "../ui/tabs-styles";

type ViewTabItem = {
  value: string;
  label: string;
  href: string;
};

type ViewTabsProps = {
  /** Accessible name for the view switcher landmark. */
  label: string;
  items: readonly ViewTabItem[];
  activeValue: string;
  className?: string;
};

/**
 * A line tab row that navigates: each view is a real link, so the active view
 * carries `aria-current="page"` instead of tab semantics (there is no in-page
 * tabpanel to own). Shares its recipe with `TabsList`/`TabsTrigger`, so a
 * routed view switcher and a panel switcher render identically.
 */
export function ViewTabs({ label, items, activeValue, className }: ViewTabsProps) {
  return (
    <div className="group/tabs flex flex-col" data-orientation="horizontal">
      <nav
        aria-label={label}
        data-variant="line"
        className={cn(tabsListVariants({ variant: "line" }), className)}
      >
        {items.map((item) => {
          const active = item.value === activeValue;
          return (
            // Each view is a data-heavy sibling route, so speculative prefetch stays off.
            <NavigationLink
              key={item.value}
              href={item.href}
              prefetch={false}
              data-active={active ? "" : undefined}
              aria-current={active ? "page" : undefined}
              className={tabsTriggerClass}
            >
              {item.label}
            </NavigationLink>
          );
        })}
      </nav>
    </div>
  );
}
