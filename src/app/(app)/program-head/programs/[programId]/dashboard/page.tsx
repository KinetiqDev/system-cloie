import { notFound } from "next/navigation";
import { BarChart3, ClipboardList, Clock, FileCheck, Gauge, Layers } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProgramHeadDashboard } from "@/features/analytics/services/get-program-head-dashboard";
import { StakeholderMeanComparison } from "@/features/analytics/components/stakeholder-mean-comparison";
import { QualitativeWordCloud } from "@/features/analytics/components/qualitative-word-cloud";
import { buildProgramHeadAnalyticsPath } from "@/lib/constants/program-head-routes";
import { cn } from "@/lib/utils";

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

  const kpiCards = [
    {
      label: "Submitted Responses",
      value: dashboard.kpi.submittedResponseCount,
      icon: <FileCheck aria-hidden="true" />,
    },
    {
      label: "Evaluation Opportunities",
      value: dashboard.kpi.evaluationOpportunityCount,
      icon: <ClipboardList aria-hidden="true" />,
    },
    {
      label: "Rating Count",
      value: dashboard.kpi.ratingCount,
      icon: <BarChart3 aria-hidden="true" />,
    },
    {
      label: "Mean Rating",
      value: dashboard.kpi.meanRating === null ? "—" : dashboard.kpi.meanRating.toFixed(2),
      icon: <Gauge aria-hidden="true" />,
    },
    {
      label: "Pending Responses",
      value: dashboard.kpi.pendingResponses,
      icon: <Clock aria-hidden="true" />,
    },
    {
      label: "Active Deployments",
      value: dashboard.kpi.activeDeployments,
      icon: <Layers aria-hidden="true" />,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-heading-lg">Dashboard</h1>
          <p className="text-body-md text-text-secondary">
            <span className="text-link font-semibold">
              {dashboard.programCode} — {dashboard.programLabel}
            </span>{" "}
            · Program overview and evaluation insights
          </p>
        </div>
        <Link
          href={buildProgramHeadAnalyticsPath(programId)}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <BarChart3 aria-hidden="true" className="size-4" />
          View full Analytics
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((kpi) => (
          <KPICard key={kpi.label} label={kpi.label} value={kpi.value} icon={kpi.icon} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StakeholderMeanComparison data={dashboard.stakeholderMeans} />
        <QualitativeWordCloud
          title="Qualitative Response Insights"
          tokens={dashboard.wordCloudTokens}
          responseCount={dashboard.qualitativeItemCount}
        />
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
