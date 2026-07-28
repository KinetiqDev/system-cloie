"use client";

import Link, { useLinkStatus } from "next/link";
import { useEffect, useId, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NavigationLinkProps extends ComponentProps<typeof Link> {
  children: ReactNode;
}

function PendingIndicator({ onPendingChange }: { onPendingChange: (pending: boolean) => void }) {
  const { pending } = useLinkStatus();

  useEffect(() => {
    onPendingChange(pending);
  }, [onPendingChange, pending]);

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute top-2 right-2 size-1.5 rounded-full bg-current transition-opacity motion-reduce:transition-none ${pending ? "animate-pulse opacity-100" : "opacity-0"}`}
    />
  );
}

export function NavigationLink({ children, ...props }: NavigationLinkProps) {
  const [pending, setPending] = useState(false);
  const pendingStatusId = useId();

  return (
    <>
      <Link
        {...props}
        className={cn("relative", props.className)}
        aria-describedby={pending ? pendingStatusId : undefined}
      >
        {children}
        <PendingIndicator onPendingChange={setPending} />
      </Link>
      {pending && (
        <span id={pendingStatusId} className="sr-only" role="status" aria-live="polite">
          Loading
        </span>
      )}
    </>
  );
}
