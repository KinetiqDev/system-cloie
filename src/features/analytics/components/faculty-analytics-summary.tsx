"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Users, Percent, Star } from "lucide-react";

type FacultyAnalyticsSummaryProps = {
  totalEvaluations: number;
  totalResponses: number;
  totalAssignments: number;
  responseRate: number;
  overallMean: number | null;
  isLoading: boolean;
};

export function FacultyAnalyticsSummary({
  totalEvaluations,
  totalResponses,
  totalAssignments,
  responseRate,
  overallMean,
  isLoading,
}: FacultyAnalyticsSummaryProps) {
  const cards = [
    {
      title: "Evaluations",
      value: totalEvaluations,
      icon: FileText,
      description: "Selected evaluations",
    },
    {
      title: "Responses",
      value: totalResponses,
      icon: Users,
      description: `${totalAssignments} total assignments`,
    },
    {
      title: "Response Rate",
      value: `${responseRate.toFixed(1)}%`,
      icon: Percent,
      description: "Completion rate",
    },
    {
      title: "Overall Mean",
      value: overallMean !== null ? overallMean.toFixed(2) : "—",
      icon: Star,
      description: "Average rating (1-5)",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="font-heading text-heading-xl text-foreground tabular-nums">
                  {card.value}
                </div>
                <p className="text-muted-foreground text-xs">{card.description}</p>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
