import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { buttonVariants } from "@/components/ui/button";
import { buildProgramHeadDashboardPath } from "@/lib/constants/program-head-routes";
import type { ProgramHeadProgram } from "@/features/auth/services/resolve-program-head-context";

export function ProgramHeadNoAssignmentState() {
  return (
    <Empty className="min-h-[40vh] border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BookOpen aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle role="heading" aria-level={2}>
          No Program assigned
        </EmptyTitle>
        <EmptyDescription>
          Your Program Head account does not have an active Program assignment. Contact a Secretary
          to continue.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <p className="text-muted-foreground text-xs">
          Management data is unavailable until an assignment is active.
        </p>
        <Link href="/program-head/profile" className={buttonVariants({ variant: "outline" })}>
          Review account profile
        </Link>
      </EmptyContent>
    </Empty>
  );
}

export function ProgramHeadSelector({ programs }: { programs: ProgramHeadProgram[] }) {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-primary text-label-sm tracking-wider uppercase">
          Program Head workspace
        </p>
        <h1 className="font-heading text-text-primary text-2xl font-black">Choose a Program</h1>
        <p className="text-text-secondary max-w-2xl text-sm">
          Select the Program you want to manage. Each workspace opens one explicit Program context;
          no Program is selected on your behalf.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2" aria-label="Assigned Programs">
        {programs.map((program) => (
          <Card key={program.id} className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>{program.code}</CardTitle>
              <CardDescription>{program.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={buildProgramHeadDashboardPath(program.id)}
                className={buttonVariants({
                  variant: "outline",
                  className: "w-full justify-between",
                })}
              >
                Open {program.code}
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
