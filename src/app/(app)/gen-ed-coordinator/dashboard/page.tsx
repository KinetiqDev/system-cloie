import Link from "next/link";
import { Suspense } from "react";
import { BarChart3, BookOpen, Library, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import {
  getGenEdDashboard,
  type GenEdDashboardData,
} from "@/features/course-assignments/services/read-gen-ed-dashboard";
import { GenEdDashboardLoading } from "@/features/course-assignments/components/gen-ed-dashboard-loading";

export const metadata = {
  title: "Dashboard — Gen Ed Coordinator | System CLOIE",
};

export default function GenEdCoordinatorDashboardPage() {
  const dashboardPromise = getGenEdDashboard();
  void dashboardPromise.catch(() => undefined);

  return (
    <div className="flex flex-col gap-6">
      <PageIntro />
      <Suspense fallback={<GenEdDashboardLoading />}>
        <GenEdDashboardDetails dashboardPromise={dashboardPromise} />
      </Suspense>
    </div>
  );
}

async function GenEdDashboardDetails({
  dashboardPromise,
}: {
  dashboardPromise: Promise<GenEdDashboardData>;
}) {
  const data = await dashboardPromise;
  return <GenEdDashboardContent data={data} />;
}

export function GenEdDashboardContent({ data }: { data: GenEdDashboardData }) {
  const { activeAssignments, geCourses, programsWithAssignments, emptyReason } = data;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription className="text-label-sm tracking-wider uppercase">
              Active GE Assignments
            </CardDescription>
            <CardTitle className="text-heading-xl tabular-nums">{activeAssignments.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent className="text-text-secondary flex items-center gap-2 text-xs">
            <UsersRound className="size-4" aria-hidden="true" />
            Across {programsWithAssignments.toLocaleString()} program(s)
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="text-label-sm tracking-wider uppercase">GE Courses</CardDescription>
            <CardTitle className="text-heading-xl tabular-nums">{geCourses.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent className="text-text-secondary flex items-center gap-2 text-xs">
            <BookOpen className="size-4" aria-hidden="true" />
            General Education catalog
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="text-label-sm tracking-wider uppercase">Scope</CardDescription>
            <div className="flex items-center gap-2">
              <CardTitle className="text-heading-md">College-Wide</CardTitle>
              <Badge variant="secondary" className="bg-primary-soft text-selected-fg font-semibold">
                General Education
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="text-text-secondary flex items-center gap-2 text-xs">
            <Library className="size-4" aria-hidden="true" />
            All active programs
          </CardContent>
        </Card>
      </div>

      {emptyReason === "no-courses" ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No General Education courses in catalog</EmptyTitle>
            <EmptyDescription>
              The catalog has no active courses with General Education scope. Courses are managed by the catalog administrator.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      {emptyReason === "no-assignments" ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersRound aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No active General Education assignments yet</EmptyTitle>
            <EmptyDescription>
              General Education courses exist but are not assigned. Create the first assignment to get started.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/gen-ed-coordinator/course-assignments" className={cn(buttonVariants({ size: "sm" }))}>
              <UsersRound aria-hidden="true" className="size-4" />
              Assign faculty
            </Link>
          </EmptyContent>
        </Empty>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-title-md">General Education Assignments</CardTitle>
            <CardDescription>Create and manage GE course assignments across programs</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-text-secondary">
              Every GE course is shared college-wide. Assignments carry the class program context and are scoped to General
              Education.
            </p>
            <Link
              href="/gen-ed-coordinator/course-assignments"
              className={cn(buttonVariants({ variant: "outline", size: "sm", className: "mt-4" }))}
            >
              Go to Course Assignments
            </Link>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-title-md">General Education Analytics</CardTitle>
            <CardDescription>Aggregate Course-bound evidence across programs</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-text-secondary">
              Submitted Course-bound responses only. Excludes Program-specific and Central Deployments.
            </p>
            <Link
              href="/gen-ed-coordinator/analytics"
              className={cn(buttonVariants({ variant: "outline", size: "sm", className: "mt-4" }))}
            >
              Open analytics
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function PageIntro() {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-lg">Gen Ed Coordinator Dashboard</h1>
        <p className="text-body-sm text-text-secondary max-w-2xl">
          Coordinate General Education course assignments across all active programs.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/gen-ed-coordinator/course-assignments" className={cn(buttonVariants({ size: "sm" }))}>
          <UsersRound aria-hidden="true" className="size-4" />
          Manage assignments
        </Link>
        <Link
          href="/gen-ed-coordinator/analytics"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <BarChart3 aria-hidden="true" className="size-4" />
          View analytics
        </Link>
      </div>
    </div>
  );
}
