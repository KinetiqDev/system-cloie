import Link from "next/link";
import { BarChart3, BookOpen, Library, UsersRound } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/prisma";
import { cn } from "@/lib/utils";

export default async function GenEdCoordinatorDashboardPage() {
  const [activeAssignments, geCourses, activeGeAssignmentsByProgram] = await Promise.all([
    prisma.courseAssignment.count({
      where: { is_active: true, course: { course_scope: "GENERAL_EDUCATION" } },
    }),
    prisma.course.count({ where: { course_scope: "GENERAL_EDUCATION" } }),
    prisma.courseAssignment.groupBy({
      by: ["program_id"],
      where: { is_active: true, course: { course_scope: "GENERAL_EDUCATION" } },
      _count: true,
    }),
  ]);

  const programsWithAssignments = activeGeAssignmentsByProgram.length;
  const unassignedCoursesNote =
    geCourses === 0
      ? "No General Education courses in catalog."
      : activeAssignments === 0
        ? "No active General Education assignments yet."
        : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-text-primary text-2xl font-black">Gen Ed Coordinator Dashboard</h1>
          <p className="text-text-secondary text-sm">
            Coordinate General Education course assignments across all active programs.
          </p>
        </div>
        <div className="flex gap-2">
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription className="text-xs font-semibold tracking-wider uppercase">
              Active GE Assignments
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{activeAssignments.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground flex items-center gap-2 text-xs">
            <UsersRound className="size-4" aria-hidden="true" />
            Across {programsWithAssignments.toLocaleString()} program(s)
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="text-xs font-semibold tracking-wider uppercase">
              GE Courses
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{geCourses.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground flex items-center gap-2 text-xs">
            <BookOpen className="size-4" aria-hidden="true" />
            course_scope = GENERAL_EDUCATION
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="text-xs font-semibold tracking-wider uppercase">
              Scope
            </CardDescription>
            <CardTitle className="text-lg font-bold">College-Wide</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground flex items-center gap-2 text-xs">
            <Library className="size-4" aria-hidden="true" />
            All active programs
          </CardContent>
        </Card>
      </div>

      {unassignedCoursesNote ? (
        <Card className="border-dashed">
          <CardContent className="text-text-secondary py-6 text-sm">{unassignedCoursesNote}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">General Education Assignments</CardTitle>
            <CardDescription>Create and manage GE course assignments across programs</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-text-secondary">
              Every GE course is shared college-wide. Assignments carry the class program context and are scoped
              by <code className="bg-muted rounded px-1 py-0.5">course.course_scope == GENERAL_EDUCATION</code>.
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
            <CardTitle className="text-lg font-bold">General Education Analytics</CardTitle>
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
    </div>
  );
}
