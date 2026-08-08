import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { CourseBoundReviewTabs } from "@/features/analytics/components/course-bound-review-tabs";
import type { CourseBoundReviewDetail } from "@/features/analytics/types";

const meanBarChartMock = vi.fn();
const qualitativeWordCloudMock = vi.fn();

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/features/analytics/components/mean-bar-chart", () => ({
  MeanBarChart: ({
    data,
    title,
  }: {
    data: Array<{ label: string; value: number | null }>;
    title: string;
  }) => {
    meanBarChartMock({ data, title });
    return <div>Mean chart: {title}</div>;
  },
}));

vi.mock("@/features/analytics/components/qualitative-word-cloud", () => ({
  QualitativeWordCloud: ({
    title,
    tokens,
    responseCount,
  }: {
    title: string;
    tokens: Array<{ text: string; value: number }>;
    responseCount?: number;
  }) => {
    qualitativeWordCloudMock({ title, tokens, responseCount });
    return <div>Word cloud: {title}</div>;
  },
}));

const detail: CourseBoundReviewDetail = {
  courseTitle: "Capstone 2",
  deadlineAt: new Date("2026-01-10T10:00:00.000Z"),
  evaluationId: "eval-1",
  evaluationTitle: "Post-Term CILO Evaluation Tool",
  overallMean: 4.25,
  programLabel: "BSIT",
  termInstanceLabel: "2025-2026 • 1st Semester",
  ciloMetrics: [],
  responseCards: [
    {
      overallMean: 4,
      responseId: "response-1",
      respondentLabel: "Respondent R-827493",
      submittedAt: new Date("2026-01-04T08:00:00.000Z"),
    },
  ],
  responseCount: 1,
  reviewerRole: "FACULTY",
  qualitativeItemCount: 2,
  sections: [
    {
      id: "teaching",
      mean: 4.25,
      name: "Teaching",
      qualitativePromptCount: 1,
      quantitativeQuestionCount: 2,
      questions: [
        { itemKey: "clarity", mean: 4.5, prompt: "Clarity" },
        { itemKey: "preparedness", mean: 4, prompt: "Preparedness" },
      ],
    },
  ],
  wordCloudTokens: [
    { text: "clear", value: 3 },
    { text: "helpful", value: 2 },
  ],
};

describe("CourseBoundReviewTabs", () => {
  it("passes section and question means to mean chart wrappers", () => {
    meanBarChartMock.mockClear();

    render(
      <CourseBoundReviewTabs detail={detail} responseBasePath="/faculty/cilo-evaluations/eval-1" />
    );

    fireEvent.click(screen.getByRole("tab", { name: "Section Analytics" }));

    expect(meanBarChartMock).toHaveBeenCalledTimes(2);
    expect(meanBarChartMock).toHaveBeenNthCalledWith(1, {
      data: [{ label: "Teaching", value: 4.25 }],
      title: "Section Means",
    });
    expect(meanBarChartMock).toHaveBeenNthCalledWith(2, {
      data: [
        { label: "Clarity", value: 4.5 },
        { label: "Preparedness", value: 4 },
      ],
      title: "Teaching Question Means",
    });
  });

  it("passes word cloud tokens to qualitative wrapper", () => {
    qualitativeWordCloudMock.mockClear();

    render(
      <CourseBoundReviewTabs detail={detail} responseBasePath="/faculty/cilo-evaluations/eval-1" />
    );

    fireEvent.click(screen.getByRole("tab", { name: "Word Cloud" }));

    expect(qualitativeWordCloudMock).toHaveBeenCalledTimes(1);
    expect(qualitativeWordCloudMock).toHaveBeenCalledWith({
      title: "Qualitative Feedback",
      tokens: [
        { text: "clear", value: 3 },
        { text: "helpful", value: 2 },
      ],
      responseCount: 2,
    });
  });

  it("renders shared review tab labels", () => {
    render(
      <CourseBoundReviewTabs detail={detail} responseBasePath="/faculty/cilo-evaluations/eval-1" />
    );

    expect(screen.getByRole("tab", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Section Analytics" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Responses" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Word Cloud" })).toBeInTheDocument();
  });

  it("renders anonymized response cards with view links", () => {
    render(
      <CourseBoundReviewTabs detail={detail} responseBasePath="/faculty/cilo-evaluations/eval-1" />
    );

    fireEvent.click(screen.getByRole("tab", { name: "Responses" }));

    const viewLink = screen.getByRole("link", { name: "View Response" });
    expect(viewLink).toHaveAttribute(
      "href",
      "/faculty/cilo-evaluations/eval-1/responses/response-1"
    );
    expect(screen.getByText("Respondent R-827493")).toBeInTheDocument();
  });

  it("wires analytics and word cloud tabs to shared visual components", () => {
    render(
      <CourseBoundReviewTabs detail={detail} responseBasePath="/faculty/cilo-evaluations/eval-1" />
    );

    fireEvent.click(screen.getByRole("tab", { name: "Section Analytics" }));
    expect(screen.getByText("Mean chart: Section Means")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Word Cloud" }));
    expect(screen.getByText("Word cloud: Qualitative Feedback")).toBeInTheDocument();
  });
});
