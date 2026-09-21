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
      className="group bg-surface hover:border-primary/30 hover:ring-primary/20 flex h-full flex-col rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:ring-1"
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="bg-primary-soft text-selected-fg group-hover:bg-primary/10 flex size-14 items-center justify-center rounded-2xl transition-colors duration-300">
          {icon}
        </div>
        <span className="text-label-sm bg-primary-soft text-selected-fg rounded-full px-3 py-1 font-semibold">
          {badge}
        </span>
      </div>

      <h2 className="text-title-md text-foreground mb-2 font-semibold">{title}</h2>
      <p className="text-body-sm text-muted-foreground mb-5 flex-1">{description}</p>

      <div className="mb-5 flex flex-wrap gap-x-2 gap-y-1.5">
        {roles.map((role) => (
          <span
            key={role}
            className="bg-surface-muted text-label-sm text-muted-foreground rounded-md px-2 py-0.5 font-medium"
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
