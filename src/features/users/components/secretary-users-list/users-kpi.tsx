import { Users, GraduationCap, UsersRound, Briefcase, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SecretaryUsersKPI } from "../../services/list-secretary-users-summary";

interface UsersKPIProps {
  kpi: SecretaryUsersKPI;
}

export function UsersKPI({ kpi }: UsersKPIProps) {
  const stats: Array<{
    label: string;
    value: number;
    sub: string;
    icon: LucideIcon;
  }> = [
    { label: "Total Users", value: kpi.totalUsers, sub: "Across all roles", icon: Users },
    { label: "Students", value: kpi.totalStudents, sub: "Enrolled learners", icon: GraduationCap },
    { label: "Alumni", value: kpi.totalAlumni, sub: "Graduates", icon: UsersRound },
    {
      label: "Industry",
      value: kpi.totalIndustryPartners,
      sub: "External partners",
      icon: Briefcase,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card
          key={stat.label}
          className="motion-safe:transition-shadow motion-safe:duration-200 motion-safe:hover:shadow-sm"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-title-sm">{stat.label}</CardTitle>
            <stat.icon className="text-muted-foreground size-4" aria-hidden />
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <span className="font-heading text-heading-xl text-foreground tabular-nums">
              {stat.value}
            </span>
            <CardDescription>{stat.sub}</CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
