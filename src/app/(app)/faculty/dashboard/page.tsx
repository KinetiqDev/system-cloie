import { redirect } from "next/navigation";
import { BarChart3, Clock, FileCheck, Layers } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { getFacultyDashboard } from "@/features/analytics/services/get-faculty-dashboard";
import { CourseMeanPieChart } from "@/features/analytics/components/course-mean-pie-chart";
import { QualitativeWordCloud } from "@/features/analytics/components/qualitative-word-cloud";
import { ROLES } from "@/lib/constants/roles";

export default async function FacultyDashboardPage() {
  const session = await resolveAuthSession();

  if (!session) {
    redirect("/portal/respondents");
  }

  if (session.activeRole !== ROLES.FACULTY) {
    redirect("/unauthorized");
  }

  const dashboard = await getFacultyDashboard(session.userId);

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
          · Evaluation insights and response analytics
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Active Evaluations"
          value={dashboard.kpi.activeEvaluations}
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
        {/* Pie Chart — Mean per Course */}
        <CourseMeanPieChart data={dashboard.courseMeans} />

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
