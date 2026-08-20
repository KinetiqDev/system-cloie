import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GenEdCoordinatorDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-text-primary text-2xl font-black">Gen Ed Coordinator Dashboard</h1>
        <p className="text-text-secondary text-sm">Coordinate General Education course assignments across programs.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>General Education</CardTitle>
          <CardDescription>Course assignments and analytics for General Education courses.</CardDescription>
        </CardHeader>
        <CardContent className="text-text-secondary text-sm">Dashboard content coming in the next slice.</CardContent>
      </Card>
    </div>
  );
}
