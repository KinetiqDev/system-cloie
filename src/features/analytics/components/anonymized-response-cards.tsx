import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CourseBoundReviewResponseCard } from "@/features/analytics/types";

type AnonymizedResponseCardsProps = {
  responses: CourseBoundReviewResponseCard[];
  responseBasePath: string;
};

function formatMean(value: number | null) {
  return value === null ? "N/A" : value.toFixed(2);
}

export function AnonymizedResponseCards({
  responses,
  responseBasePath,
}: AnonymizedResponseCardsProps) {
  if (responses.length === 0) {
    return (
      <div className="border-border text-text-muted rounded-lg border border-dashed p-4 text-sm">
        No submitted responses yet.
      </div>
    );
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {responses.map((response) => (
        <li key={response.responseId}>
          <Card size="sm">
            <CardHeader className="gap-1">
              <CardTitle>{response.respondentLabel}</CardTitle>
              <p className="text-text-muted text-xs">
                Submitted {response.submittedAt.toLocaleDateString()}
              </p>
            </CardHeader>

            <CardContent className="flex items-center justify-between gap-4">
              <p className="text-text-muted text-sm">
                Mean:{" "}
                <span className="text-text-primary font-semibold">
                  {formatMean(response.overallMean)}
                </span>
              </p>
              <Button
                render={<Link href={`${responseBasePath}/responses/${response.responseId}`} />}
                size="sm"
                variant="outline"
              >
                View Response
              </Button>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
