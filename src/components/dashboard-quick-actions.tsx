import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useId, type ComponentType } from "react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export type DashboardQuickAction = {
  href: string;
  label: string;
  detail?: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
};

export function DashboardQuickActions({
  title = "Quick actions",
  description,
  actions,
}: {
  title?: string;
  description: string;
  actions: DashboardQuickAction[];
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <Card>
        <CardHeader>
          <h2
            id={headingId}
            className="font-heading text-base leading-snug font-medium text-balance"
          >
            {title}
          </h2>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <nav aria-label={title}>
            <ul className="flex flex-col">
              {actions.map(({ href, label, detail, icon: Icon }) => (
                <li key={`${href}::${label}`} className="border-border/60 border-b last:border-b-0">
                  <Link
                    href={href}
                    className="focus-visible:ring-ring hover:bg-surface-hover group -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 focus-visible:ring-3 focus-visible:outline-none motion-reduce:transition-none pointer-coarse:min-h-12"
                  >
                    <span className="bg-primary-soft text-selected-fg flex size-9 shrink-0 items-center justify-center rounded-lg">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-title-sm text-text-primary text-pretty">{label}</span>
                      {detail ? (
                        <span className="text-caption text-muted-foreground text-pretty">
                          {detail}
                        </span>
                      ) : null}
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="text-text-secondary size-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </CardContent>
      </Card>
    </section>
  );
}
