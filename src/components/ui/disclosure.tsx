import { ChevronDown } from "lucide-react";
import type { DetailsHTMLAttributes, HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * Native-details disclosure with a visible dropdown affordance.
 *
 * `<details>`/`<summary>` keeps keyboard toggling and expanded state free for
 * assistive technology; the bordered trigger and rotating chevron make the
 * interactive region unmistakable, which raw markers never achieved across
 * the analytics surfaces.
 */
function Disclosure({ className, ...props }: DetailsHTMLAttributes<HTMLDetailsElement>) {
  return <details className={cn("group", className)} {...props} />;
}

type DisclosureTriggerProps = HTMLAttributes<HTMLElement> & {
  /**
   * `chip` — bordered dropdown-style trigger for section disclosures.
   * `card` — full-width header trigger inside a card; chevron trails the label.
   * `link` — compact inline trigger for row-level or overflow disclosures.
   */
  variant?: "chip" | "card" | "link";
};

const TRIGGER_VARIANTS = {
  chip: "text-label-sm text-text-secondary hover:text-foreground border-border/70 bg-muted/50 hover:bg-muted w-fit gap-1.5 rounded-md border px-3 py-1.5",
  card: "text-foreground hover:bg-muted/60 w-full gap-3 rounded-lg px-2 py-2",
  link: "text-label-sm text-text-secondary hover:text-foreground w-fit gap-1 rounded-sm px-1 py-1",
} as const;

function DisclosureTrigger({
  variant = "chip",
  className,
  children,
  ...props
}: DisclosureTriggerProps) {
  const chevron = (
    <ChevronDown
      aria-hidden="true"
      className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
    />
  );

  return (
    <summary
      className={cn(
        "focus-visible:ring-ring flex cursor-pointer list-none items-center font-semibold transition-colors select-none focus-visible:ring-2 focus-visible:outline-hidden pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden",
        TRIGGER_VARIANTS[variant],
        className
      )}
      {...props}
    >
      {variant === "card" ? (
        <>
          <span className="min-w-0 flex-1 text-left">{children}</span>
          {chevron}
        </>
      ) : (
        <>
          {chevron}
          <span className="min-w-0">{children}</span>
        </>
      )}
    </summary>
  );
}

function DisclosureContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("pt-3", className)} {...props} />;
}

export { Disclosure, DisclosureTrigger, DisclosureContent };
