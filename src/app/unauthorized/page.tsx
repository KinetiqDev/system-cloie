import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="font-heading text-base leading-snug font-medium">Unauthorized</h1>
          <CardDescription>
            You are signed in, but your current role cannot access this section.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/dashboard" />}>
            Return to dashboard
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
