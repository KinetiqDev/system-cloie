import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DeanEnrollmentRosterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-heading-lg">Class Roster</h1>
        <p className="text-body-md text-text-secondary">Explicit, read-only roster drill-down for one course context.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Roster access</CardTitle>
          <CardDescription>Roster data is limited to the selected Academic Period and course assignment.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
