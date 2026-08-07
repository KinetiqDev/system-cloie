"use client";

import { QualitativeWordCloud } from "./qualitative-word-cloud";
import type { FacultyAnalyticsData, WordCloudToken } from "../types";

type FacultyQualitativeCloudProps = {
  data: FacultyAnalyticsData[];
};

export function FacultyQualitativeCloud({ data }: FacultyQualitativeCloudProps) {
  let qualitativeItemCount = 0;
  const tokenMap = new Map<string, number>();

  for (const evalData of data) {
    qualitativeItemCount += evalData.qualitativeItemCount;

    for (const token of evalData.wordCloudTokens) {
      tokenMap.set(token.text, (tokenMap.get(token.text) || 0) + token.value);
    }
  }

  const aggregatedTokens: WordCloudToken[] = Array.from(tokenMap.entries())
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 100); // Top 100 words

  return (
    <QualitativeWordCloud
      title="Qualitative Feedback"
      tokens={aggregatedTokens}
      responseCount={qualitativeItemCount}
    />
  );
}
