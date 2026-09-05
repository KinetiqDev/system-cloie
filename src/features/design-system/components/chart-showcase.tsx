"use client";

import { MeanBarChart } from "@/features/analytics/components/mean-bar-chart";
import { QualitativeWordCloud } from "@/features/analytics/components/qualitative-word-cloud";
import { StakeholderMeanPieChart } from "@/features/analytics/components/stakeholder-mean-pie-chart";
import {
  SHOWCASE_CHART_BARS,
  SHOWCASE_CHART_PIE,
  SHOWCASE_WORD_CLOUD,
} from "@/features/design-system/data/showcase-fixtures";

export function ChartShowcase() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-title-sm text-foreground">
          Bar chart with repeated-token hatch distinction
        </h3>
        <p className="text-body-sm text-muted-foreground">
          Seven categories over the approved five-token palette: the sixth and seventh categories
          repeat a color and receive a deterministic hatch pattern while remaining identifiable
          through direct labels and the exact-value table.
        </p>
        <MeanBarChart title="Mean Attainment by Stakeholder" data={[...SHOWCASE_CHART_BARS]} />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-title-sm text-foreground">
          Pie chart with pattern distinction
        </h3>
        <p className="text-body-sm text-muted-foreground">
          Six slices over the approved five-token palette: the sixth slice repeats a color and
          receives a deterministic hatch pattern.
        </p>
        <StakeholderMeanPieChart data={[...SHOWCASE_CHART_PIE]} />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-title-sm text-foreground">
          Word cloud with a bounded ranked view
        </h3>
        <p className="text-body-sm text-muted-foreground">
          Two views over one fixed frame: a ranked exact-values table, and a word cloud whose words
          use one accessible ink tier per frequency band. Tokens are static fixture data — no
          submitted response text is ever rendered here.
        </p>
        <QualitativeWordCloud
          title="Sample Word Cloud"
          tokens={[...SHOWCASE_WORD_CLOUD]}
          answerCount={24}
        />
      </section>
    </div>
  );
}
