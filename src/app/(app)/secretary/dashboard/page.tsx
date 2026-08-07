import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SecretaryDashboardPage() {
  const [userCount, programCount, courseCount, templateCount] = await Promise.all([
    prisma.user.count(),
    prisma.program.count({ where: { is_active: true } }),
    prisma.course.count({ where: { is_active: true } }),
    prisma.instrumentTemplate.count({ where: { is_active: true } }),
  ]);

  const quickLinks = [
    { href: "/secretary/users", label: "Users, roles, and invites" },
    { href: "/secretary/programs", label: "Programs and majors" },
    { href: "/secretary/courses", label: "Course catalog" },
    { href: "/secretary/instruments", label: "Baseline instruments" },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-text-primary text-2xl font-black">Secretary Dashboard</h1>
        <p className="text-text-secondary text-sm">
          Operate the academic and access foundation that powers every downstream stakeholder
          workflow.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          { label: "Users", value: userCount },
          { label: "Programs", value: programCount },
          { label: "Courses", value: courseCount },
          { label: "Templates", value: templateCount },
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
      </div>

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
