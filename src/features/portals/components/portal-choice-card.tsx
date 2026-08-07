"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface PortalChoiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  roles: string[];
  href: string;
  badge: string;
}

export function PortalChoiceCard({
  icon,
  title,
  description,
  roles,
  href,
  badge,
}: PortalChoiceCardProps) {
  return (
    <a
      href={href}
      className="group flex h-full flex-col rounded-2xl border bg-surface p-6 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md hover:ring-1 hover:ring-primary/20"
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-selected-fg transition-colors duration-300 group-hover:bg-primary/10">
          {icon}
        </div>
        <span className="text-label-sm rounded-full bg-primary-soft px-3 py-1 font-semibold text-selected-fg">
          {badge}
        </span>
      </div>

      <h2 className="text-title-md mb-2 font-semibold text-foreground">{title}</h2>
      <p className="text-body-sm mb-5 flex-1 text-muted-foreground">{description}</p>

      <div className="mb-5 flex flex-wrap gap-x-2 gap-y-1.5">
        {roles.map((role) => (
          <span
            key={role}
            className="rounded-md bg-surface-muted px-2 py-0.5 text-label-sm font-medium text-muted-foreground"
          >
            {role}
          </span>
        ))}
      </div>

      <Button
        variant="default"
        className="w-full gap-2 shadow-sm transition-all duration-200 hover:shadow-md"
      >
        Continue
        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </Button>
    </a>
  );
}
