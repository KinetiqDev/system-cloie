"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AssignmentSummaryBlockProps {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function AssignmentSummaryBlock({
  title,
  children,
  className,
}: AssignmentSummaryBlockProps) {
  return (
    <div className={cn("rounded-xl border bg-muted/40 p-4 space-y-2", className)}>
      {title !== undefined && <p className="text-sm font-medium">{title}</p>}
      {children}
    </div>
  );
}
