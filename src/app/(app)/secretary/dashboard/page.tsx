import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const quickLinks = [
  { href: "/secretary/users", label: "Users, roles, and invites" },
  { href: "/secretary/programs", label: "Programs and majors" },
  { href: "/secretary/courses", label: "Course catalog" },
  { href: "/secretary/instruments", label: "Baseline instruments" },
] as const;

type SecretaryDashboardCounts = {
  userCount: number;
  programCount: number;
  courseCount: number;
  templateCount: number;
};

async function getSecretaryDashboardCounts(): Promise<SecretaryDashboardCounts> {
  const [userCount, programCount, courseCount, templateCount] = await Promise.all([
    prisma.user.count(),
    prisma.program.count({ where: { is_active: true } }),
    prisma.course.count({ where: { is_active: true } }),
    prisma.instrumentTemplate.count({ where: { is_active: true } }),
  ]);

  return { userCount, programCount, courseCount, templateCount };
}

export default function SecretaryDashboardPage() {
  // Start the read before rendering so the static shell and the counts overlap.
  const countsPromise = getSecretaryDashboardCounts();
  void countsPromise.catch(() => undefined);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-text-primary text-2xl font-black">Secretary Dashboard</h1>
        <p className="text-text-secondary text-sm">
          Operate the academic and access foundation that powers every downstream stakeholder
          workflow.
        </p>
      </div>

      <Suspense fallback={<SecretaryStatsFallback />}>
        <SecretaryStats countsPromise={countsPromise} />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle>Secretary Workflows</CardTitle>
          <CardDescription>
            These pages now serve as the operational foundation for catalog, access, and baseline
            governance.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="border-border hover:border-primary/40 hover:bg-primary-soft/40 rounded-xl border px-4 py-3 text-sm font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

async function SecretaryStats({
  countsPromise,
}: {
  countsPromise: Promise<SecretaryDashboardCounts>;
}) {
  const counts = await countsPromise;

  return (
    <SecretaryStatsGrid>
      {[
        { label: "Users", value: counts.userCount },
        { label: "Programs", value: counts.programCount },
        { label: "Courses", value: counts.courseCount },
        { label: "Templates", value: counts.templateCount },
      ].map((stat) => (
        <Card key={stat.label}>
          <CardHeader className="pb-2">
            <CardDescription>{stat.label}</CardDescription>
            <CardTitle className="font-heading text-heading-xl text-foreground tabular-nums">
              {stat.value}
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </SecretaryStatsGrid>
  );
}

function SecretaryStatsGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">{children}</div>;
}

function SecretaryStatsFallback() {
  return (
    <SecretaryStatsGrid>
      {["users", "programs", "courses", "templates"].map((stat) => (
        <Card key={stat}>
          <CardHeader className="flex flex-col gap-3 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-16" />
          </CardHeader>
        </Card>
      ))}
    </SecretaryStatsGrid>
  );
}
