import { ArrowRight } from "lucide-react";

interface PortalChoiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  badge: string;
}

export function PortalChoiceCard({ icon, title, description, href, badge }: PortalChoiceCardProps) {
  return (
    <a
      href={href}
      className="group bg-surface border-border focus-visible:ring-ring hover:border-primary/30 flex h-full flex-col rounded-2xl border p-5 shadow-sm transition-[border-color,box-shadow] duration-200 hover:shadow-md focus-visible:ring-3 focus-visible:outline-none sm:p-6"
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

      <span
        aria-hidden="true"
        className="bg-primary text-primary-foreground flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium"
      >
        Sign in
        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </a>
  );
}
