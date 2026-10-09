import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useId, type ComponentType } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

type DashboardQuickAction = {
  href: string;
  label: string;
  detail?: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
};

export function DashboardQuickActions({
  title = "Quick actions",
  description,
  actions,
  typography = "compact",
}: {
  title?: string;
  description: string;
  actions: DashboardQuickAction[];
  typography?: "compact" | "comfortable";
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <Card>
        <CardHeader>
          <h2 id={headingId} className="text-heading-lg text-balance">
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
                      <span
                        className={cn(
                          "text-text-primary text-pretty",
                          typography === "comfortable" ? "text-title-md" : "text-title-sm"
                        )}
                      >
                        {label}
                      </span>
                      {detail ? (
                        <span
                          className={cn(
                            "text-pretty",
                            typography === "comfortable"
                              ? "text-body-sm text-text-secondary"
                              : "text-caption text-muted-foreground"
                          )}
                        >
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
