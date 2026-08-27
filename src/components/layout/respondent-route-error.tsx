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
            Please try again. If it still won&apos;t load, return to your dashboard and try again
            later.
          </AlertDescription>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={reset} variant="default">
            Try Again
          </Button>
          <Button variant="outline" render={<Link href={returnHref} />}>
            Return to Dashboard
          </Button>
        </div>
      </Alert>
    </div>
  );
}
