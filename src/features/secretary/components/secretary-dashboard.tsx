import Link from "next/link";
import { ArrowRight, CalendarDays, ClipboardList, UserPlus, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SecretaryDashboardData } from "../services/read-secretary-dashboard";

const inventoryItems = [
  { key: "users", label: "Users", href: "/secretary/users" },
  { key: "activePrograms", label: "Active Programs", href: "/secretary/programs" },
  { key: "activeCourses", label: "Active Courses", href: "/secretary/courses" },
  {
    key: "activeBaselineInstruments",
    label: "Baseline Instruments",
    href: "/secretary/instruments",
  },
] as const;

const quickActions = [
  {
    href: "/secretary/users/new",
    title: "Add User",
    description: "Provision an internal or stakeholder account",
    icon: UserPlus,
  },
  {
    href: "/secretary/school-years",
    title: "Manage School Years",
    description: "Control the Academic Period lifecycle",
    icon: CalendarDays,
  },
  {
    href: "/secretary/course-assignments",
    title: "Find a Course Roster",
    description: "Open an assignment and manage its Student roster",
    icon: UsersRound,
  },
  {
    href: "/secretary/course-assignments",
    title: "View Course Assignments",
    description: "Review assignments across all Programs",
    icon: ClipboardList,
  },
] as const;

export function SecretaryDashboard({ data }: { data: SecretaryDashboardData }) {
  const attentionItems = [
    {
      count: data.attention.studentsAwaitingTermPlacement,
      label: "Students awaiting term placement",
      href: "/secretary/users?state=awaiting-term-placement",
    },
    {
      count: data.attention.pendingExternalVerification,
      label: "External accounts pending verification",
      href: "/secretary/users?verification=pending",
    },
    {
      count: data.attention.activeAssignmentsWithoutRoster,
      label: "Active classes without roster members",
      href: data.activePeriod
        ? `/secretary/course-assignments?termInstanceId=${data.activePeriod.id}&roster=empty`
        : "/secretary/course-assignments",
    },
  ].filter((item) => item.count > 0);

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="active-period-heading">
        <Card className={cn(!data.activePeriod && "border-warning/40 bg-warning-soft/30")}>
          <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <CardDescription id="active-period-heading" className="text-label-sm uppercase">
                  Active Academic Period
                </CardDescription>
                <Badge variant={data.activePeriod ? "success" : "warning"}>
                  {data.activePeriod ? "Active" : "Action required"}
                </Badge>
              </div>
              <CardTitle className="text-heading-lg text-pretty">
                {data.activePeriod?.label ?? "No active Academic Period"}
              </CardTitle>
              <CardDescription className="max-w-3xl text-pretty">
                {data.activePeriod
                  ? "Course assignments, enrollments, rosters, and deployments use this Academic Period."
                  : "Student term placement and active-period roster changes are unavailable until an Academic Period is activated."}
              </CardDescription>
            </div>
            <Link
              href="/secretary/school-years"
              className={cn(buttonVariants({ variant: data.activePeriod ? "outline" : "default" }), "w-full sm:w-auto")}
            >
              Manage Calendar
              <ArrowRight aria-hidden="true" data-icon="inline-end" />
            </Link>
          </CardHeader>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Needs Attention</CardTitle>
            <CardDescription>Current account and active-period setup tasks.</CardDescription>
          </CardHeader>
          <CardContent>
            {attentionItems.length > 0 ? (
              <ul className="divide-border divide-y">
                {attentionItems.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="focus-visible:ring-ring hover:bg-surface-hover flex min-h-14 items-center gap-3 rounded-lg px-2 py-3 transition-colors focus-visible:ring-3 focus-visible:outline-none"
                    >
                      <span className="bg-warning-soft text-warning flex size-9 shrink-0 items-center justify-center rounded-lg font-semibold tabular-nums">
                        {item.count}
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-medium text-pretty">{item.label}</span>
                      <ArrowRight aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border-border bg-surface-muted rounded-lg border px-4 py-6">
                <p className="font-medium">Nothing needs attention</p>
                <p className="text-muted-foreground mt-1 text-sm text-pretty">
                  No pending account or active-period setup tasks were found.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common Secretary workflows.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {quickActions.map(({ href, title, description, icon: Icon }) => (
              <Link
                key={title}
                href={href}
                className="border-border focus-visible:ring-ring hover:border-primary/40 hover:bg-primary-soft/40 flex min-h-24 min-w-0 flex-col gap-2 rounded-xl border p-3 transition-colors focus-visible:ring-3 focus-visible:outline-none lg:min-h-0 lg:flex-row lg:items-start"
              >
                <Icon aria-hidden="true" className="text-primary size-5 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-pretty">{title}</span>
                  <span className="text-muted-foreground mt-0.5 hidden text-xs text-pretty sm:block">
                    {description}
                  </span>
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="inventory-heading" className="flex flex-col gap-3">
        <div>
          <h2 id="inventory-heading" className="text-heading-md">Institution at a Glance</h2>
          <p className="text-body-sm text-text-secondary">Current institutional records.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {inventoryItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="focus-visible:ring-ring rounded-xl focus-visible:ring-3 focus-visible:outline-none"
            >
              <Card className="hover:border-primary/40 hover:bg-surface-hover h-full transition-colors">
                <CardHeader className="gap-1 p-4">
                  <CardDescription className="text-pretty">{item.label}</CardDescription>
                  <CardTitle className="text-heading-xl tabular-nums">{data.inventory[item.key]}</CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
