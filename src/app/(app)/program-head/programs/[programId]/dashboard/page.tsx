import { notFound } from "next/navigation";
import { BarChart3, Clock, FileCheck, Layers } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProgramHeadDashboard } from "@/features/analytics/services/get-program-head-dashboard";
import { StakeholderMeanPieChart } from "@/features/analytics/components/stakeholder-mean-pie-chart";
import { QualitativeWordCloud } from "@/features/analytics/components/qualitative-word-cloud";

export default async function SelectedProgramDashboardPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const dashboard = await getProgramHeadDashboard(programId);

  if (!dashboard) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-lg">Dashboard</h1>
        <p className="text-body-md text-text-secondary">
          <span className="text-primary font-semibold">
            {dashboard.programCode} — {dashboard.programLabel}
          </span>{" "}
          · Program overview and evaluation insights
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard label="Active Deployments" value={dashboard.kpi.activeDeployments} icon={<Layers aria-hidden="true" />} />
        <KPICard label="Responses Received" value={dashboard.kpi.totalResponses} icon={<FileCheck aria-hidden="true" />} />
        <KPICard label="Overall Mean" value={dashboard.kpi.overallMean ?? "—"} icon={<BarChart3 aria-hidden="true" />} />
        <KPICard label="Pending Responses" value={dashboard.kpi.pendingResponses} icon={<Clock aria-hidden="true" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StakeholderMeanPieChart data={dashboard.stakeholderMeans} />
        <QualitativeWordCloud title="Qualitative Response Insights" tokens={dashboard.wordCloudTokens} />
      </div>
    </div>
  );
}

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
          <CardDescription className="text-xs font-semibold tracking-wider uppercase">{label}</CardDescription>
          <span className="text-muted-foreground [&_svg]:size-5">{icon}</span>
        </div>
        <CardTitle className="text-2xl font-bold">
          {typeof value === "number" ? value.toLocaleString() : value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
