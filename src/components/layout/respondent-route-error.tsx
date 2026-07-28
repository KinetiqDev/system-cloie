"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type RespondentRouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  returnHref: string;
};

export function RespondentRouteError({ error, reset, returnHref }: RespondentRouteErrorProps) {
  useEffect(() => {
    console.error("Respondent route error");
  }, [error]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-4">
      <Alert variant="destructive" className="max-w-xl gap-4 p-6">
        <div>
          <h2 className="text-base font-medium">We couldn&apos;t load this page</h2>
          <AlertDescription className="mt-1">
            Please try again or return to your dashboard.
          </AlertDescription>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={reset} variant="outline">
            Try Again
          </Button>
          <Link
            href={returnHref}
            className="border-border bg-background hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-8 items-center justify-center rounded-lg border px-2.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3"
          >
            Return to Dashboard
          </Link>
        </div>
      </Alert>
    </div>
  );
}
