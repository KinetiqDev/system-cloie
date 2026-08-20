import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GenEdCoordinatorCourseAssignmentsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-text-primary text-2xl font-black">Course Assignments</h1>
        <p className="text-text-secondary text-sm">General Education course assignments across programs.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
          <CardDescription>Manage General Education course assignments.</CardDescription>
        </CardHeader>
        <CardContent className="text-text-secondary text-sm">Assignment management coming in the next slice.</CardContent>
      </Card>
    </div>
  );
}
