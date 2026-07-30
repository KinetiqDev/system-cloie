import { redirect } from "next/navigation";
import { BarChart3, Clock, FileCheck, Layers } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { prisma } from "@/lib/db/prisma";
import { getProgramHeadDashboardForScope } from "@/features/analytics/services/get-program-head-dashboard";
import { StakeholderMeanPieChart } from "@/features/analytics/components/stakeholder-mean-pie-chart";
import { QualitativeWordCloud } from "@/features/analytics/components/qualitative-word-cloud";
import { ROLES } from "@/lib/constants/roles";

export default async function ProgramHeadDashboardPage() {
  const session = await resolveAuthSession();

  if (!session) {
    redirect("/portal/respondents");
  }

  if (session.activeRole !== ROLES.PROGRAM_HEAD) {
    redirect("/unauthorized");
  }

  // Resolve the program head's active program assignment
  const assignment = await prisma.programHeadAssignment.findFirst({
    where: {
      program_head_id: session.userId,
      is_active: true,
    },
    include: {
      program: { select: { id: true, code: true, name: true } },
    },
  });

  if (!assignment) {
    return (
      <div className="space-y-4">
        <h1 className="text-heading-lg">Dashboard</h1>
        <p className="text-body-md text-text-secondary">
          You do not have an active program assignment. Please contact an administrator.
        </p>
      </div>
    );
  }

  const dashboard = await getProgramHeadDashboardForScope({
    programId: assignment.program.id,
    programCode: assignment.program.code,
    programLabel: assignment.program.name,
  });

  if (!dashboard) {
    redirect("/unauthorized");
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-heading-lg">Dashboard</h1>
        <p className="text-body-md text-text-secondary">
          <span className="text-primary font-semibold">
            {dashboard.programCode} — {dashboard.programLabel}
          </span>{" "}
          · Program overview and evaluation insights
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Active Deployments"
          value={dashboard.kpi.activeDeployments}
          icon={<Layers className="text-muted-foreground size-5" />}
        />
        <KPICard
          label="Responses Received"
          value={dashboard.kpi.totalResponses}
          icon={<FileCheck className="text-muted-foreground size-5" />}
        />
        <KPICard
          label="Overall Mean"
          value={dashboard.kpi.overallMean ?? "—"}
          icon={<BarChart3 className="text-muted-foreground size-5" />}
        />
        <KPICard
          label="Pending Responses"
          value={dashboard.kpi.pendingResponses}
          icon={<Clock className="text-muted-foreground size-5" />}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pie Chart — Mean per Stakeholder */}
        <StakeholderMeanPieChart data={dashboard.stakeholderMeans} />

        {/* Word Cloud — Qualitative Responses */}
        <QualitativeWordCloud
          title="Qualitative Response Insights"
          tokens={dashboard.wordCloudTokens}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Card sub-component
// ---------------------------------------------------------------------------

function KPICard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs font-semibold tracking-wider uppercase">
            {label}
          </CardDescription>
          {icon}
        </div>
        <CardTitle className="text-2xl font-bold">
          {typeof value === "number" ? value.toLocaleString() : value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
