import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RoleSelectionCard } from "./role-selection-card";
import { SessionBanner } from "./session-banner";
import type { RoleCardConfig } from "../lib/role-card-config";
import { ArrowLeft } from "lucide-react";

export const THREE_CARD_GRID_CLASS_NAME =
  "mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3";
export const DEFAULT_GRID_CLASS_NAME =
  "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

interface PortalShellProps {
  title: string;
  subtitle: string;
  cards: RoleCardConfig[];
  session: {
    email: string;
    isComplete: boolean;
  } | null;
  backLink?: { label: string; href: string };
}

export function PortalShell({
  title,
  subtitle,
  cards,
  session,
  backLink,
}: PortalShellProps) {
  return (
    <div className="relative min-h-screen bg-background selection:bg-primary/10">
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {backLink && (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2"
            render={<Link href={backLink.href} />}
          >
            <ArrowLeft className="size-4 shrink-0 mr-1.5" />
            {backLink.label}
          </Button>
        )}

        <div className="mx-auto mt-16 mb-16 max-w-2xl text-center">
          <h1 className="text-heading-xl mb-4 text-foreground">{title}</h1>
          <p className="text-body-lg text-muted-foreground">{subtitle}</p>

          {session && (
            <SessionBanner email={session.email} isComplete={session.isComplete} />
          )}
        </div>

        <div className={cards.length === 3 ? THREE_CARD_GRID_CLASS_NAME : DEFAULT_GRID_CLASS_NAME}>
          {cards.map((config) => (
            <RoleSelectionCard key={config.role} config={config} />
          ))}
        </div>
      </div>
    </div>
  );
}
