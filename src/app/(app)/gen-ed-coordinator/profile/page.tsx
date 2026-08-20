import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GenEdCoordinatorProfilePage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-text-primary text-2xl font-black">Profile</h1>
        <p className="text-text-secondary text-sm">Your coordinator profile.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Coordinator profile details.</CardDescription>
        </CardHeader>
        <CardContent className="text-text-secondary text-sm">Profile content coming soon.</CardContent>
      </Card>
    </div>
  );
}
