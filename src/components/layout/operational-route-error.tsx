"use client";

import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type OperationalRouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  returnHref: string;
};

export function OperationalRouteError({ error, reset, returnHref }: OperationalRouteErrorProps) {
  void error;

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-4">
      <Alert variant="destructive" className="flex max-w-xl flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="font-medium">We couldn&apos;t load this page</h2>
          <AlertDescription>Please try again or return to your dashboard.</AlertDescription>
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
