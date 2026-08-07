import * as React from "react";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        /**
         * Specialized ACD cyan accent action.
         * Intentionally distinct from `default` (operational primary).
         * SHALL NOT be used as a second generic primary.
         */
        "brand-accent":
          "bg-brand-accent text-brand-accent-on hover:bg-brand-accent-hover active:bg-brand-accent-active focus-visible:border-brand-accent-border focus-visible:ring-brand-accent/30",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** When true, shows a spinner, disables interaction, and preserves label + width. */
    loading?: boolean;
  };

function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  children,
  ...props
}: ButtonProps) {
  // Base UI uses the 'render' prop for delegation, not 'asChild'.
  // We destructure asChild here to prevent it from being passed to the DOM.
  const { asChild: _asChild, disabled, ...rest } = props;

  // Spinner size tracks button size: xs/sm → sm, default/lg → default, icon* → default.
  const spinnerSize = size === "xs" || size === "sm" ? "sm" : "default";

  return (
    <ButtonPrimitive
      data-slot="button"
      nativeButton={!rest.render}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      {...rest}
    >
      {loading ? (
        /*
         * Single wrapper child keeps the button's intrinsic flex layout unchanged
         * — the spinner is absolutely centered and adds zero flex width.
         * Layout width is driven by the opacity-0 spacer (aria-hidden, visual only).
         * A sr-only sibling carries the accessible name so the button label is
         * announced by AT as "Save Changes, busy, dimmed" rather than unnamed.
         * aria-busy on the button signals the in-progress state to AT.
         */
        <span className="relative inline-flex items-center justify-center">
          <Spinner size={spinnerSize} aria-hidden="true" className="absolute" />
          {/* Visual spacer — drives button width, hidden from AT */}
          <span className="pointer-events-none opacity-0 select-none" aria-hidden="true">
            {children}
          </span>
          {/* Accessible label — no visible pixels, read by AT */}
          <span className="sr-only">{children}</span>
        </span>
      ) : (
        children
      )}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
