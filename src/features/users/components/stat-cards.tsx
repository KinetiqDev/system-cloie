import { Card } from "@/components/ui/card";
import { FileText, Clock, CheckCircle } from "lucide-react";

interface StatCardsProps {
  pending: number;
  inProgress: number;
  completed: number;
}

export function StatCards({ pending, inProgress, completed }: StatCardsProps) {
  const stats = [
    {
      label: "Pending",
      value: pending,
      sub: "Awaiting submission",
      color: "text-link",
      bg: "bg-primary-soft",
      tileColor: "text-selected-fg",
      icon: FileText,
    },
    {
      label: "In Progress",
      value: inProgress,
      sub: "Drafts saved",
      color: "text-text-secondary",
      bg: "bg-secondary-soft",
      icon: Clock,
    },
    {
      label: "Completed",
      value: completed,
      sub: "Total submissions",
      color: "text-success",
      bg: "bg-success-soft",
      icon: CheckCircle,
    },
  ];

  return (
    <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((s) => (
        <Card key={s.label} className="border-border p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-label-sm text-text-muted font-bold tracking-wider uppercase">
              {s.label}
            </span>
            <div className={`p-2 ${s.bg} rounded-lg ${s.tileColor ?? s.color}`}>
              <s.icon className="size-5" />
            </div>
          </div>
          <div className={`text-display-md font-black ${s.color}`}>{s.value}</div>
          <div className="text-body-sm text-text-muted font-medium">{s.sub}</div>
        </Card>
      ))}
    </section>
  );
}
