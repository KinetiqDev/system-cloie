import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Server-rendered section shell for the Design System Showcase.
 * Anchors are addressed by the table of contents (scroll-mt keeps the
 * section title clear of the app topbar).
 */
export function ShowcaseSection({
  id,
  title,
  description,
  content,
  className,
}: {
  id: string;
  title: string;
  description: string;
  content: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-24", className)}>
      <div className="flex flex-col gap-1.5">
        <h2
          id={`${id}-title`}
          className="text-heading-lg font-heading text-foreground tracking-tight"
        >
          {title}
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="mt-6">{content}</div>
    </section>
  );
}
