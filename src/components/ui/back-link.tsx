import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BackLinkBase = {
  children: ReactNode;
  className?: string;
  size?: "sm" | "default";
};

type BackLinkHref = BackLinkBase & {
  href: string;
  onClick?: never;
};

type BackLinkAction = BackLinkBase & {
  href?: never;
  onClick: () => void;
};

// fallow-ignore-next-line unused-type
export type BackLinkProps = BackLinkHref | BackLinkAction;

/**
 * Single upward-navigation control for top-of-page "Back to X" actions.
 * Ghost styling keeps it below primary and secondary actions in the hierarchy.
 * Use `href` for plain navigation and `onClick` only when leaving needs a guard
 * (for example the template builder's unsaved-changes confirm).
 */
export function BackLink({ children, className, size = "sm", ...props }: BackLinkProps) {
  // Secondary (not muted) text: the muted role now clears AA on the app
  // background, but secondary stays the safer upward-navigation ink.
  const styles = cn("-ml-2 w-fit gap-1.5 text-text-secondary hover:text-foreground", className);

  if (props.href !== undefined) {
    const href = props.href;
    return (
      <Link
        href={href}
        data-slot="button"
        className={buttonVariants({ variant: "ghost", size, className: styles })}
      >
        <ArrowLeft data-icon="inline-start" aria-hidden="true" />
        {children}
      </Link>
    );
  }

  return (
    <Button type="button" onClick={props.onClick} variant="ghost" size={size} className={styles}>
      <ArrowLeft data-icon="inline-start" aria-hidden="true" />
      {children}
    </Button>
  );
}
