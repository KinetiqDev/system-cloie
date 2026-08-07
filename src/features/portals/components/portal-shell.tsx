import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RoleSelectionCard } from "./role-selection-card";
import { SessionBanner } from "./session-banner";
import type { RoleCardConfig } from "../lib/role-card-config";
import { ArrowRight, Building2, Users, Home } from "lucide-react";

const THREE_CARD_GRID_CLASS_NAME =
  "mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3";
const DEFAULT_GRID_CLASS_NAME = "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

interface PortalShellProps {
  title: string;
  subtitle: string;
  cards: RoleCardConfig[];
  session: {
    email: string;
    isComplete: boolean;
  } | null;
  backLink?: { label: string; href: string };
  crossLink?: { label: string; href: string };
}

export function PortalShell({
  title,
  subtitle,
  cards,
  session,
  backLink,
  crossLink,
}: PortalShellProps) {
  return (
    <div className="relative min-h-screen bg-background selection:bg-primary/10">
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h1 className="text-heading-xl mb-4 text-foreground">{title}</h1>
          <p className="text-body-lg text-muted-foreground">{subtitle}</p>

          {session && (
            <SessionBanner email={session.email} isComplete={session.isComplete} />
          )}

          {/* Navigation Actions */}
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {backLink && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full min-w-0 whitespace-normal break-words sm:w-auto sm:whitespace-nowrap h-auto"
                render={<Link href={backLink.href} />}
              >
                <Home className="size-4 shrink-0 mr-1.5" />
                {backLink.label}
              </Button>
            )}

            {crossLink && (
              <Button
                variant="outline"
                size="sm"
                className="w-full min-w-0 whitespace-normal break-words sm:w-auto sm:whitespace-nowrap h-auto"
                render={<Link href={crossLink.href} />}
              >
                {crossLink.href.includes("staff") ? (
                  <Building2 className="size-4 shrink-0 mr-1.5" />
                ) : (
                  <Users className="size-4 shrink-0 mr-1.5" />
                )}
                {crossLink.label}
                <ArrowRight className="size-4 shrink-0 ml-1.5" />
              </Button>
            )}
          </div>
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
