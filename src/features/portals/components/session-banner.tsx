"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, LogOut } from "lucide-react";

interface SessionBannerProps {
  email: string;
  isComplete: boolean;
}

export function SessionBanner({ email, isComplete }: SessionBannerProps) {
  return (
    <div className="mt-8 inline-flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-4">
      <p className="text-body-sm text-muted-foreground">
        Signed in as <span className="font-medium text-foreground">{email}</span>
      </p>
      <div className="flex items-center gap-3">
        <form action="/api/auth/logout" method="post">
          <Button variant="outline" size="sm" type="submit">
            <LogOut className="mr-2 size-4" />
            Sign Out
          </Button>
        </form>
        {isComplete && (
          <Button render={<Link href="/dashboard" />} size="sm">
            Go to Dashboard
            <ArrowRight className="ml-2 size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
