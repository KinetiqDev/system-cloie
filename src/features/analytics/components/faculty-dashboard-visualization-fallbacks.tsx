import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function VisualizationLoading({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={label}>
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function CourseMeanPieChartFallback() {
  return (
    <VisualizationLoading label="Loading overall mean by course visualization">
      <Card className="min-h-[424px]">
        <CardHeader>
          <CardTitle>Overall Mean by Course</CardTitle>
          <CardDescription>Quantitative mean scores grouped by course</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton aria-hidden="true" className="h-80 w-full rounded-lg" />
        </CardContent>
      </Card>
    </VisualizationLoading>
  );
}

export function QualitativeWordCloudFallback() {
  return (
    <VisualizationLoading label="Loading qualitative response insights visualization">
      <Card className="min-h-[424px]">
        <CardHeader>
          <CardTitle>Qualitative Response Insights</CardTitle>
          <CardDescription>Frequent words from qualitative feedback</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton aria-hidden="true" className="h-80 w-full rounded-lg" />
        </CardContent>
      </Card>
    </VisualizationLoading>
  );
}
