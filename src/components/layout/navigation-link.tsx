"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NavigationLinkProps extends ComponentProps<typeof Link> {
  children: ReactNode;
}

function PendingIndicator() {
  const { pending } = useLinkStatus();

  return (
    <>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-2 right-2 size-1.5 rounded-full bg-current transition-opacity motion-reduce:transition-none ${pending ? "animate-pulse opacity-100" : "opacity-0"}`}
      />
    </>
  );
}

export function NavigationLink({ children, prefetch = false, ...props }: NavigationLinkProps) {
  return (
    <Link
      {...props}
      prefetch={prefetch}
      className={cn("relative", props.className)}
      aria-busy={props["aria-busy"] ?? undefined}
    >
      {children}
      <PendingIndicator />
    </Link>
  );
}
