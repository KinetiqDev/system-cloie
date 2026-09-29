import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PortalChoiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  badge: string;
}

export function PortalChoiceCard({ icon, title, description, href, badge }: PortalChoiceCardProps) {
  return (
    <Link
      href={href}
      aria-label={`Sign in: ${title}`}
      className="group bg-surface border-border focus-visible:ring-ring hover:border-primary/30 flex h-full flex-col rounded-2xl border p-5 shadow-sm transition-[border-color,box-shadow] duration-200 hover:shadow-md focus-visible:ring-3 focus-visible:outline-none sm:p-6"
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="bg-primary-soft text-selected-fg group-hover:bg-primary/10 flex size-14 items-center justify-center rounded-2xl transition-colors duration-300">
          {icon}
        </div>
        <Badge variant="secondary" className="shrink-0">
          {badge}
        </Badge>
      </div>

      <h2 className="text-title-md text-foreground mb-2 font-semibold">{title}</h2>
      <p className="text-body-sm text-muted-foreground mb-5 flex-1">{description}</p>

      <span
        aria-hidden="true"
        className={cn(
          buttonVariants({ size: "lg" }),
          "group-hover:bg-primary-hover group-active:bg-primary-active w-full"
        )}
      >
        Sign in
        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
