import { cva } from "class-variance-authority";

/**
 * Tab recipes shared by the panel tabs (`TabsList`/`TabsTrigger`) and the
 * link-based view switcher (`ViewTabs`). Both render the same tab, so the
 * recipe lives here, outside the client boundary, and no surface patches tab
 * geometry at the callsite.
 */
export const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-text-secondary group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none data-[variant=pill]:h-auto data-[variant=pill]:gap-2 data-[variant=pill]:rounded-none data-[variant=pill]:bg-transparent data-[variant=pill]:p-0",
  {
    variants: {
      variant: {
        default: "bg-muted h-8 pointer-coarse:h-auto",
        // A line row scrolls its own overflow: `justify-start` keeps the first
        // tab reachable, and the bottom padding holds the indicator, which sits
        // below the trigger box, clear of the scroll clip.
        line: "gap-4 justify-start bg-transparent min-w-0 max-w-full overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        pill: "bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const triggerBaseClass =
  "text-text-secondary hover:text-foreground focus-visible:border-ring focus-visible:ring-ring focus-visible:outline-ring relative inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow] group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-60 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 aria-disabled:pointer-events-none aria-disabled:opacity-60 motion-reduce:transition-none pointer-coarse:min-h-11 data-active:border-transparent data-active:text-selected-fg";

const triggerLineClass =
  "group-data-[variant=line]/tabs-list:h-auto group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:shrink-0 group-data-[variant=line]/tabs-list:data-active:border-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent group-data-[variant=line]/tabs-list:data-active:shadow-none";

// The segmented variant fills the list track; the others size to their label.
const triggerSegmentedClass =
  "group-data-[variant=default]/tabs-list:h-[calc(100%-1px)] group-data-[variant=default]/tabs-list:data-active:bg-primary-soft group-data-[variant=default]/tabs-list:data-active:shadow-sm";

const triggerPillClass =
  "group-data-[variant=pill]/tabs-list:bg-surface group-data-[variant=pill]/tabs-list:data-active:bg-primary group-data-[variant=pill]/tabs-list:data-active:text-on-primary group-data-[variant=pill]/tabs-list:min-h-11 group-data-[variant=pill]/tabs-list:flex-initial group-data-[variant=pill]/tabs-list:rounded-full group-data-[variant=pill]/tabs-list:px-5 group-data-[variant=pill]/tabs-list:data-active:border-transparent group-data-[variant=pill]/tabs-list:data-active:shadow-none group-data-[variant=pill]/tabs-list:after:hidden";

const triggerIndicatorClass =
  "after:bg-primary after:absolute after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100";

/**
 * The tab label itself. `line` marks the active view with the selected
 * foreground over a primary underline, which sits below the trigger box — the
 * line list reserves room for it (see `tabsListVariants`).
 */
export const tabsTriggerClass = [
  triggerBaseClass,
  triggerLineClass,
  triggerSegmentedClass,
  triggerPillClass,
  triggerIndicatorClass,
].join(" ");
