import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BackLinkBase = {
  children: ReactNode;
  className?: string;
};

type BackLinkHref = BackLinkBase & {
  href: string;
  onClick?: never;
};

type BackLinkAction = BackLinkBase & {
  href?: never;
  onClick: () => void;
};

export type BackLinkProps = BackLinkHref | BackLinkAction;

/**
 * Single upward-navigation control for top-of-page "Back to X" actions.
 * Ghost styling keeps it below primary and secondary actions in the hierarchy.
 * Use `href` for plain navigation and `onClick` only when leaving needs a guard
 * (for example the template builder's unsaved-changes confirm).
 */
export function BackLink({ children, className, ...props }: BackLinkProps) {
  const styles = cn(
    "-ml-2 w-fit gap-1.5 text-muted-foreground hover:text-foreground",
    className
  );

  if (props.href !== undefined) {
    const href = props.href;
    return (
      <Button render={<Link href={href} />} variant="ghost" size="sm" className={styles}>
        <ArrowLeft data-icon="inline-start" aria-hidden="true" />
        {children}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      onClick={props.onClick}
      variant="ghost"
      size="sm"
      className={styles}
    >
      <ArrowLeft data-icon="inline-start" aria-hidden="true" />
      {children}
    </Button>
  );
}
