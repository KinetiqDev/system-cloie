import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type OutcomeKpi = {
  label: string;
  value: number;
  tone?: "default" | "success" | "muted";
};

const valueTone = {
  default: "text-foreground",
  success: "text-success",
  muted: "text-muted-foreground",
} as const;

export function OutcomeKpiGrid({ items }: { items: OutcomeKpi[] }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2 min-[400px]:grid-cols-3 sm:gap-4",
        items.length === 2 && "min-[400px]:grid-cols-2"
      )}
      role="group"
      aria-label="Outcome mapping summary"
    >
      {items.map(({ label, value, tone = "default" }) => (
        <Card key={label} size="sm" className="min-w-0">
          <CardHeader className="min-w-0 gap-0 px-3 pt-3 pb-0 sm:px-4 sm:pt-4">
            <CardTitle className="text-label-sm text-muted-foreground sm:text-title-sm leading-tight font-semibold">
              {label}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">
            <p
              className={cn(
                "font-heading sm:text-display-md text-[2rem] leading-none font-bold tracking-tight tabular-nums",
                valueTone[tone]
              )}
            >
              {value.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
