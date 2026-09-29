import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BackLink } from "@/components/ui/back-link";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Focused centered shell for Operate-mode public entry pages (sign-in,
 * registration, verification, recovery, status-adjacent help). Low density,
 * single column, one H1 per page.
 */
export function EntryShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="entry-links mx-auto flex w-full max-w-lg min-w-0 flex-col px-4 py-6 sm:py-12">
      <BackLink href="/" className="mb-5 min-h-11 self-start">
        All sign-in options
      </BackLink>
      <div className="mb-7 flex flex-col items-center text-center">
        <div className="mb-5 flex items-center gap-4">
          <Image
            src="/logos/acd-logo.png"
            alt="Assumption College of Davao seal"
            width={48}
            height={48}
            className="shrink-0 object-contain"
          />
          <Image
            src="/logos/cloie-logo.svg"
            alt="System CLOIE"
            width={442}
            height={500}
            className="h-12 w-auto shrink-0 object-contain"
            priority
          />
        </div>
        <h1 className="text-heading-lg text-foreground font-bold tracking-tight">{title}</h1>
        <p className="text-body-md text-muted-foreground mt-2">{description}</p>
      </div>

      <Card className="border-border bg-surface min-w-0 overflow-visible shadow-sm">
        <CardContent className="entry-controls min-w-0 space-y-5 overflow-visible px-5 py-6 sm:px-8">
          {children}
        </CardContent>
      </Card>

      {footer ? <div className="mt-6 text-center">{footer}</div> : null}

      <p className="text-body-sm text-muted-foreground mt-6 text-center">
        Need help?{" "}
        <Link
          href="/#help"
          className="text-link hover:text-primary-hover font-medium underline-offset-4 hover:underline"
        >
          Visit help and FAQs
        </Link>
      </p>
    </div>
  );
}
