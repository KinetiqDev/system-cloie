import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GenEdCoordinatorAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-text-primary text-2xl font-black">Analytics</h1>
        <p className="text-text-secondary text-sm">General Education analytics across programs.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
          <CardDescription>Evidence analytics for General Education courses.</CardDescription>
        </CardHeader>
        <CardContent className="text-text-secondary text-sm">Analytics coming in the next slice.</CardContent>
      </Card>
    </div>
  );
}
