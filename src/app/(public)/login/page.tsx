import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CloieLogoMark } from "@/components/brand/cloie-logo-mark";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Sign In") };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const error = resolvedSearchParams?.error;

  // Bare /login with no error — the scoped entrances live on the landing page.
  if (!error) {
    redirect("/");
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
          <CloieLogoMark className="h-14" priority />
        </div>
        <h1 className="text-display-md text-primary font-bold tracking-tight">System CLOIE</h1>
        <p className="text-muted-foreground mt-2 text-center">
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

      {/* Back to entrances link */}
      <Card className="border-border bg-surface shadow-sm">
        <CardHeader className="space-y-3 pt-8 pb-6 text-center">
          <CardTitle className="text-heading-lg text-foreground font-bold">Welcome Back</CardTitle>
          <CardDescription className="text-body-md text-muted-foreground mx-auto max-w-[280px]">
            Return to the System CLOIE entrances to choose how you sign in.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pb-8">
          <div className="flex flex-col gap-2 text-center">
            <Link
              href="/login/student"
              className="text-link hover:text-primary-hover font-medium underline-offset-4 hover:underline"
            >
              Student sign in
            </Link>
            <Link
              href="/login/staff"
              className="text-link hover:text-primary-hover font-medium underline-offset-4 hover:underline"
            >
              Staff sign in
            </Link>
            <Link
              href="/login/external"
              className="text-link hover:text-primary-hover font-medium underline-offset-4 hover:underline"
            >
              Alumni &amp; partner sign in
            </Link>
          </div>

          <div className="text-center">
            <Link
              href="/"
              className="text-caption text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to all entrances →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
