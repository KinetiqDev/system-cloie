import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type DeanTool = { name: string; href: string; description: string; icon: LucideIcon };

export function DeanGroupLanding({
  title,
  purpose,
  tools,
  notice,
}: {
  title: string;
  purpose: string;
  tools: DeanTool[];
  notice?: string;
}) {
  return (
    <div className="max-w-5xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-heading-lg">{title}</h1>
        <p className="text-body-md text-text-secondary">{purpose}</p>
        {notice && <p className="text-body-sm text-text-muted">{notice}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link key={tool.href} href={tool.href} className="group block">
              <Card className="h-full transition-colors group-hover:border-primary/50 group-focus-visible:ring-2 group-focus-visible:ring-ring">
                <CardHeader>
                  <Icon className="text-primary mb-2 size-6" aria-hidden="true" />
                  <CardTitle>{tool.name}</CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
