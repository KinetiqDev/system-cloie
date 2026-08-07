import { redirect } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const error = resolvedSearchParams?.error;

  // Bare /login with no error — redirect to the main portal
  if (!error) {
    redirect("/portal/respondents");
  }

  return (
    <div className="relative z-10 mx-auto w-full max-w-md">
      {/* Header */}
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-5 flex items-center gap-4">
          <Image
            src="/logos/acd-logo.png"
            alt="Assumption College of Davao Logo"
            width={56}
            height={56}
            className="shrink-0 object-contain"
          />
          <Image
            src="/logos/cloie-logo.png"
            alt="CLOIE Logo"
            width={486}
            height={513}
            className="h-14 w-auto shrink-0 object-contain"
            priority
          />
        </div>
        <h1 className="text-display-md font-bold tracking-tight text-primary">System CLOIE</h1>
        <p className="mt-2 text-center text-muted-foreground">
          System for Comprehensive Learning Outcomes and Instructional Evaluation
        </p>
      </div>

      {/* Error Alert */}
      {error === "auth-failure" && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="size-5 shrink-0" />
          <div className="ml-3">
            <AlertTitle>Authentication Failed</AlertTitle>
            <AlertDescription>
              There was a problem signing you in. Please try again.
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Back to portal link */}
      <Card className="border-border bg-surface shadow-sm">
        <CardHeader className="space-y-3 pb-6 pt-8 text-center">
          <CardTitle className="text-heading-lg font-bold text-foreground">Welcome Back</CardTitle>
          <CardDescription className="text-body-md mx-auto max-w-[280px] text-muted-foreground">
            Return to the portal selection to choose your role.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pb-8">
          <p className="text-center text-body-sm text-muted-foreground">
            Choose a role from the public portal to review the legal documents before Google sign-in.
          </p>

          <div className="text-center">
            <a
              href="/portal/respondents"
              className="text-caption text-muted-foreground hover:text-foreground transition-colors"
            >
              Go to portal selection →
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
