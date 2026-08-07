import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Foundations reference: semantic token roles rendered through the real
 * Tailwind mappings (`src/styles/tokens.css` + `src/app/globals.css`).
 *
 * Every swatch uses a semantic utility class so the same code resolves the
 * approved Light and Dark values without duplicating palette values.
 */

function Swatch({
  className,
  name,
  note,
  textClassName = "text-foreground",
}: {
  className: string;
  name: string;
  note: string;
  textClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "border-border flex h-16 items-end rounded-lg border p-2",
          className,
          textClassName
        )}
      >
        <span className="font-mono text-xs">{name}</span>
      </div>
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

const SURFACE_SWATCHES = [
  { className: "bg-background", name: "background", note: "App background" },
  { className: "bg-surface", name: "surface", note: "Cards and panels" },
  { className: "bg-surface-alt", name: "surface-alt", note: "Alternate panels" },
  { className: "bg-surface-muted", name: "surface-muted", note: "Muted surfaces" },
  { className: "bg-surface-hover", name: "surface-hover", note: "Hover surfaces" },
  { className: "bg-surface-input", name: "surface-input", note: "Input fill" },
  { className: "bg-surface-popover", name: "surface-popover", note: "Popover and menu fill" },
  { className: "bg-card", name: "card", note: "Card surface" },
  { className: "bg-primary", name: "primary", note: "Operational primary" },
  { className: "bg-secondary", name: "secondary", note: "Neutral secondary" },
  { className: "bg-accent", name: "accent", note: "Neutral contextual hover" },
  { className: "bg-muted", name: "muted", note: "Muted interactive fill" },
];

const TEXT_SWATCHES = [
  { className: "text-foreground", name: "foreground", note: "Primary text" },
  { className: "text-muted-foreground", name: "muted-foreground", note: "Secondary text" },
  { className: "text-primary", name: "primary", note: "Interactive text" },
  { className: "text-secondary-foreground", name: "secondary-foreground", note: "On secondary" },
];

const STATUS_SWATCHES: {
  className: string;
  name: string;
  note: string;
  Icon: LucideIcon;
}[] = [
  {
    className: "bg-success-soft text-success border-success/50",
    name: "success",
    note: "Completed, valid",
    Icon: CheckCircle2,
  },
  {
    className: "bg-warning-soft text-warning border-warning/50",
    name: "warning",
    note: "Attention required",
    Icon: AlertTriangle,
  },
  {
    className: "bg-danger-soft text-danger border-danger/50",
    name: "danger",
    note: "Error, destructive",
    Icon: XCircle,
  },
  {
    className: "bg-info-soft text-info border-info/50",
    name: "information",
    note: "Neutral information",
    Icon: Info,
  },
];

const RADIUS_STEPS = [
  { className: "rounded-xs", name: "xs" },
  { className: "rounded-sm", name: "sm" },
  { className: "rounded-md", name: "md" },
  { className: "rounded-lg", name: "lg" },
  { className: "rounded-xl", name: "xl" },
  { className: "rounded-2xl", name: "2xl" },
];

const TYPE_SCALE = [
  { className: "text-display-md", name: "display-md", label: "Display" },
  { className: "text-heading-xl", name: "heading-xl", label: "Page titles" },
  { className: "text-heading-lg", name: "heading-lg", label: "Section titles" },
  { className: "text-heading-md", name: "heading-md", label: "Subsections" },
  { className: "text-title-md", name: "title-md", label: "Card titles" },
  { className: "text-title-sm", name: "title-sm", label: "Compact titles" },
  { className: "text-body-md", name: "body-md", label: "Default body" },
  { className: "text-body-sm", name: "body-sm", label: "Dense body" },
  { className: "text-label-md", name: "label-md", label: "Field labels" },
  { className: "text-label-sm", name: "label-sm", label: "Metadata" },
  { className: "text-caption", name: "caption", label: "Captions" },
];

function BlockTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-heading text-title-sm text-foreground">{children}</h3>;
}

export function TokenReference() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <BlockTitle>Surface and interaction roles</BlockTitle>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {SURFACE_SWATCHES.map((swatch) => (
            <Swatch key={swatch.name} {...swatch} />
          ))}
          <Swatch
            className="bg-scrim text-background"
            name="scrim"
            note="Overlay backdrop"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <BlockTitle>Text roles</BlockTitle>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {TEXT_SWATCHES.map((swatch) => (
            <div key={swatch.name} className="flex flex-col gap-2">
              <div className={cn("flex h-16 items-end rounded-lg border border-border p-2", swatch.className)}>
                <span className="font-mono text-xs">Aa</span>
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-mono">{swatch.name}</span> — {swatch.note}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <BlockTitle>Status roles</BlockTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATUS_SWATCHES.map((swatch) => (
            <div
              key={swatch.name}
              className={cn(
                "flex h-16 flex-col justify-between rounded-lg border p-2.5",
                swatch.className
              )}
            >
              <span className="flex items-center justify-between gap-1">
                <swatch.Icon aria-hidden className="size-3.5" />
                <span className="font-mono text-xs">{swatch.name}</span>
              </span>
              <span className="text-xs opacity-80">{swatch.note}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Completed</Badge>
          <Badge variant="warning">Attention</Badge>
          <Badge variant="destructive">Failed</Badge>
          <Badge variant="information">Information</Badge>
          <Badge variant="secondary">Neutral</Badge>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <BlockTitle>Radius and elevation</BlockTitle>
        <div className="flex flex-wrap items-end gap-4">
          {RADIUS_STEPS.map((radius) => (
            <div key={radius.name} className="flex flex-col items-center gap-2">
              <div className={cn("border-border size-14 border bg-surface", radius.className)} />
              <span className="font-mono text-xs text-muted-foreground">{radius.name}</span>
            </div>
          ))}
          <div className="flex flex-col items-center gap-2">
            <div className="size-14 rounded-lg bg-surface shadow-xl ring-1 ring-border" />
            <span className="font-mono text-xs text-muted-foreground">elevation</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <BlockTitle>Type scale</BlockTitle>
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {TYPE_SCALE.map((type) => (
            <div key={type.name} className="flex items-baseline justify-between gap-4 px-3 py-2.5">
              <span className={cn("text-foreground", type.className)}>{type.label}</span>
              <span className="font-mono text-xs text-muted-foreground">{type.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
