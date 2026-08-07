import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { AlertTriangle, CheckCircle2, Info, WifiOff, XCircle, type LucideIcon } from "lucide-react";

import {
  SHOWCASE_ALERTS,
  SHOWCASE_EMPTY_EXAMPLES,
  SHOWCASE_ERROR_REFERENCE,
  SHOWCASE_OFFLINE_REFERENCE,
  type ShowcaseStatus,
} from "@/features/design-system/data/showcase-fixtures";

const STATUS_ICON: Record<ShowcaseStatus, LucideIcon> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  information: Info,
};

const STATUS_VARIANT: Record<ShowcaseStatus, "success" | "warning" | "destructive" | "information"> = {
  success: "success",
  warning: "warning",
  danger: "destructive",
  information: "information",
};

export function FeedbackAndStateShowcase() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-title-sm text-foreground">Alerts</h3>
        <div className="flex flex-col gap-3">
          {SHOWCASE_ALERTS.map((alert) => {
            const StatusIcon = STATUS_ICON[alert.kind];
            return (
              <Alert key={alert.id} variant={STATUS_VARIANT[alert.kind]}>
                <StatusIcon aria-hidden className="size-4" />
                <AlertTitle>{alert.title}</AlertTitle>
                <AlertDescription>{alert.description}</AlertDescription>
              </Alert>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-title-sm text-foreground">Badges</h3>
        <div className="flex flex-wrap gap-2">
          {SHOWCASE_ALERTS.map((alert) => {
            const StatusIcon = STATUS_ICON[alert.kind];
            return (
              <Badge key={alert.id} variant={STATUS_VARIANT[alert.kind]} className="gap-1">
                <StatusIcon aria-hidden className="size-3.5" />
                {alert.title}
              </Badge>
            );
          })}
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="ghost">Ghost</Badge>
          <Badge variant="link">Link</Badge>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-title-sm text-foreground">Empty states</h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {SHOWCASE_EMPTY_EXAMPLES.map((empty) => (
            <Empty key={empty.id} className="rounded-lg border border-dashed border-border">
              <EmptyMedia>
                <WifiOff aria-hidden className="size-6 text-muted-foreground" />
              </EmptyMedia>
              <EmptyTitle>{empty.title}</EmptyTitle>
              <EmptyDescription>{empty.description}</EmptyDescription>
              <Button variant="outline" size="sm">
                {empty.actionLabel}
              </Button>
            </Empty>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-title-sm text-foreground">Offline and error references</h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{SHOWCASE_OFFLINE_REFERENCE.title}</CardTitle>
              <CardDescription>{SHOWCASE_OFFLINE_REFERENCE.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-body-sm text-muted-foreground">{SHOWCASE_OFFLINE_REFERENCE.note}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{SHOWCASE_ERROR_REFERENCE.title}</CardTitle>
              <CardDescription>{SHOWCASE_ERROR_REFERENCE.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-body-sm text-foreground">{SHOWCASE_ERROR_REFERENCE.cause}</p>
              <p className="text-body-sm text-muted-foreground">{SHOWCASE_ERROR_REFERENCE.impact}</p>
              <p className="text-body-sm text-muted-foreground">{SHOWCASE_ERROR_REFERENCE.recovery}</p>
              <Button variant="destructive" size="sm" className="mt-1 self-start">
                {SHOWCASE_ERROR_REFERENCE.retryLabel}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
