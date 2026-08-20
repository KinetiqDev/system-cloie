import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";

export default async function NotFound() {
  const session = await resolveAuthSession();
  const homeHref = session
    ? resolvePostLoginDestination({
        activeRole: session.activeRole,
        profileGate: session.profileGate,
        requestedPath: null,
        intent: null,
      })
    : "/";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="font-heading text-base leading-snug font-medium">Page Not Found</h1>
          <CardDescription>
            The page you are looking for does not exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href={homeHref} />}>
            Return Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
