import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DEFAULT_GRID_CLASS_NAME,
  THREE_CARD_GRID_CLASS_NAME,
} from "@/features/portals/components/portal-shell";
import type { RoleCardConfig } from "@/features/portals/lib/role-card-config";

type PublicLoadingVariant = "portal" | "form" | "status";

const loadingLabels: Record<PublicLoadingVariant, string> = {
  portal: "Loading portal",
  form: "Loading form",
  status: "Loading page",
};

function PortalSkeleton({ cards }: { cards: RoleCardConfig[] }) {
  const gridClassName =
    cards.length === 3 ? THREE_CARD_GRID_CLASS_NAME : DEFAULT_GRID_CLASS_NAME;

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div data-testid="portal-back-skeleton" className="-ml-2">
        <Skeleton className="h-9 w-40" />
      </div>

      <div className="mx-auto mt-16 mb-16 max-w-2xl text-center">
        <Skeleton className="mx-auto mb-4 h-9 w-72 max-w-full" />
        <Skeleton className="mx-auto h-5 w-full max-w-md" />
      </div>

      <div className={gridClassName}>
        {cards.map((card) => (
          <div
            key={card.role}
            data-testid="portal-card-skeleton"
            className="bg-surface border-border flex h-full flex-col rounded-2xl border p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center gap-4">
              <Skeleton className="size-12 rounded-xl" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-32" />
                {card.category === "pre_provisioned_admin" && (
                  <Skeleton className="h-4 w-24" />
                )}
              </div>
            </div>
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="mb-6 h-4 w-full max-w-[16rem]" />
            <div className="border-border/50 mt-auto space-y-4">
              <div className="flex items-start gap-2 rounded-lg border bg-background p-3">
                <Skeleton className="size-4 shrink-0" />
                <Skeleton className="h-4 w-full" />
              </div>
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl py-8">
      <Card>
        <CardHeader className="flex flex-col gap-3">
          <Skeleton className="h-6 w-56 max-w-full" />
          <Skeleton className="h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {[1, 2, 3, 4].map((field) => (
            <div key={field} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
          <Skeleton className="h-11 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function StatusSkeleton() {
  return (
    <div className="mx-auto w-full max-w-lg">
      <Card>
        <CardHeader className="flex flex-col items-center gap-4 text-center">
          <Skeleton className="size-16 rounded-2xl" />
          <Skeleton className="h-6 w-64 max-w-full" />
          <Skeleton className="h-4 w-full max-w-sm" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

import { ROLE_CARDS_RESPONDENT } from "@/features/portals/lib/role-card-config";

export function PublicRouteLoading({
  variant,
  cards = ROLE_CARDS_RESPONDENT,
}: {
  variant: PublicLoadingVariant;
  cards?: RoleCardConfig[];
}) {
  return (
    <div
      className="w-full min-w-0"
      role="status"
      aria-busy="true"
      aria-label={loadingLabels[variant]}
    >
      {variant === "portal" && <PortalSkeleton cards={cards} />}
      {variant === "form" && <FormSkeleton />}
      {variant === "status" && <StatusSkeleton />}
    </div>
  );
}
