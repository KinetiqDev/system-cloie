import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import StudentEvaluationsLoading from "@/app/(app)/student/evaluations/loading";
import StudentEvaluationLoading from "@/app/(app)/student/evaluations/[id]/loading";
import StudentHistoryLoading from "@/app/(app)/student/history/loading";
import StudentSubmissionLoading from "@/app/(app)/student/history/[responseId]/loading";
import StudentProfileLoading from "@/app/(app)/student/profile/loading";
import AlumniEvaluationsLoading from "@/app/(app)/alumni/evaluations/loading";
import AlumniEvaluationLoading from "@/app/(app)/alumni/evaluations/[id]/loading";
import AlumniHistoryLoading from "@/app/(app)/alumni/history/loading";
import AlumniProfileLoading from "@/app/(app)/alumni/profile/loading";
import AlumniSubmittedLoading from "@/app/(app)/alumni/evaluations/[id]/submitted/loading";
import IndustryPartnerEvaluationsLoading from "@/app/(app)/industry-partner/evaluations/loading";
import IndustryPartnerEvaluationLoading from "@/app/(app)/industry-partner/evaluations/[id]/loading";
import IndustryPartnerHistoryLoading from "@/app/(app)/industry-partner/history/loading";
import IndustryPartnerProfileLoading from "@/app/(app)/industry-partner/profile/loading";
import IndustryPartnerSubmittedLoading from "@/app/(app)/industry-partner/evaluations/[id]/submitted/loading";
import { EvaluationBrowserSkeleton } from "@/components/layout/respondent-route-loading";

const loadingRoutes = [
  [StudentEvaluationsLoading, "Loading your evaluations"],
  [StudentEvaluationLoading, "Loading your evaluation form"],
  [StudentHistoryLoading, "Loading your submission history"],
  [StudentSubmissionLoading, "Loading your submitted evaluation"],
  [StudentProfileLoading, "Loading your profile"],
  [AlumniEvaluationsLoading, "Loading your evaluations"],
  [AlumniEvaluationLoading, "Loading your evaluation form"],
  [AlumniHistoryLoading, "Loading your submission history"],
  [AlumniProfileLoading, "Loading your profile"],
  [AlumniSubmittedLoading, "Loading your submitted evaluation"],
  [IndustryPartnerEvaluationsLoading, "Loading your evaluations"],
  [IndustryPartnerEvaluationLoading, "Loading your evaluation form"],
  [IndustryPartnerHistoryLoading, "Loading your submission history"],
  [IndustryPartnerProfileLoading, "Loading your profile"],
  [IndustryPartnerSubmittedLoading, "Loading your submitted evaluation"],
] as const;

describe("respondent route loading boundaries", () => {
  it.each(loadingRoutes)("renders a protected-data-free skeleton for %s", (Loading, label) => {
    render(<Loading />);

    const status = screen.getByRole("status", { name: label });

    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(status).not.toHaveTextContent(/@|student|alumni|partner|202\d|term|section/i);
  });
  it("matches the responsive evaluation browser controls", () => {
    const { container } = render(<EvaluationBrowserSkeleton />);
    const controls = container.firstElementChild?.firstElementChild;

    expect(controls).toHaveClass("flex-col", "md:flex-row");
    expect(controls?.firstElementChild?.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3);
    expect(controls?.lastElementChild).toHaveClass("w-full", "md:w-64");
    expect(controls?.lastElementChild?.querySelector('[data-slot="skeleton"]')).toHaveClass(
      "h-11",
      "w-full"
    );
  });
});
