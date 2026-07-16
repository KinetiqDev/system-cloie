import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DeanEnrollmentsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-heading-lg">Enrollments</h1>
        <p className="text-body-md text-text-secondary">Read-only program and class enrollment totals by Academic Period.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Read-only oversight view</CardTitle>
          <CardDescription>Enrollment totals and explicit roster drill-down stay within Dean read contracts.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
