import { notFound } from "next/navigation";
import { getProgramHeadDashboard } from "@/features/analytics/services/get-program-head-dashboard";
import { MeanBarChart } from "@/features/analytics/components/mean-bar-chart";
import { QualitativeWordCloud } from "@/features/analytics/components/qualitative-word-cloud";

export default async function SelectedProgramAnalyticsPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const dashboard = await getProgramHeadDashboard(programId);

  if (!dashboard) {
    notFound();
  }

  const stakeholderMeanData = dashboard.stakeholderMeans.map((item) => ({
    label: item.label,
    value: item.mean,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-lg">Analytics</h1>
        <p className="text-body-md text-text-secondary">
          <span className="text-link font-semibold">
            {dashboard.programCode} — {dashboard.programLabel}
          </span>{" "}
          · Program-scoped mean summaries and qualitative insights
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <MeanBarChart title="Mean Attainment by Stakeholder" data={stakeholderMeanData} />
        <QualitativeWordCloud
          title="Qualitative Response Insights"
          tokens={dashboard.wordCloudTokens}
          responseCount={dashboard.qualitativeItemCount}
        />
      </div>
    </div>
  );
}
