import { prisma } from "@/lib/db/prisma";
import { getDeanLearningOutcomes } from "@/features/dean/services/read-dean-learning-outcomes";
import {
  getProgramHeadOutcomes,
  getProgramHeadBreakdowns,
  getProgramHeadStakeholders,
  getProgramHeadTrends,
  getProgramHeadFeedback,
} from "./get-program-head-analytics";
import {
  getGeneralEducationOutcomes,
  getGeneralEducationCourses,
  getGeneralEducationTrends,
  getGeneralEducationFeedback,
} from "./general-education-analytics";
import { getDeanCollegeAnalytics } from "./dean-analytics";
import type { DeanAnalyticsFilters } from "./dean-analytics-state";

export async function getDeanEvidence(filters: DeanAnalyticsFilters) {
  const college = await getDeanCollegeAnalytics(filters);
  if (!college) return null;
  if (filters.view === "institutional") {
    const scope = { tab: "outcomes" as const, termInstanceId: filters.termInstanceId };
    const [outcomes, courses, trends, feedback] = await Promise.all([
      getGeneralEducationOutcomes(scope, "dean"),
      getGeneralEducationCourses(scope, "dean"),
      getGeneralEducationTrends(scope, "dean"),
      getGeneralEducationFeedback(scope, "dean"),
    ]);
    return { kind: "institutional" as const, college, outcomes, courses, trends, feedback };
  }
  const program = college.programs.find((row) => row.id === filters.programId);
  if (filters.view === "college" || !program)
    return { kind: "college" as const, college, invalidProgram: !!filters.programId };
  const selectedEvaluation = filters.evaluationId
    ? college.evidence.find(
        (row) =>
          row.id === filters.evaluationId &&
          row.programId === program.id &&
          row.source !== "GENERAL_EDUCATION"
      )
    : undefined;
  if (filters.evaluationId && !selectedEvaluation)
    return { kind: "college" as const, college, invalidProgram: true };
  const scope = {
    tab: "outcomes" as const,
    termInstanceId: filters.termInstanceId,
    evidenceSource: filters.source,
  };
  const args = [program.id, scope, "dean", filters.evaluationId] as const;
  switch (filters.view) {
    case "outcomes": {
      const [data, catalog] = await Promise.all([
        getProgramHeadOutcomes(...args),
        prisma.pO.findMany({
          where: { program_id: program.id },
          select: { id: true, code: true, description: true, is_active: true },
          orderBy: { order: "asc" },
        }),
      ]);
      const alignmentState = await deanAlignmentState(
        college.periods,
        filters.termInstanceId,
        program.id
      );
      return {
        kind: "outcomes" as const,
        college,
        program,
        data,
        catalog,
        ...alignmentState,
      };
    }
    case "courses":
      return {
        kind: "courses" as const,
        college,
        program,
        data: await getProgramHeadBreakdowns(...args),
      };
    case "stakeholders":
      return {
        kind: "stakeholders" as const,
        college,
        program,
        data: await getProgramHeadStakeholders(...args),
      };
    case "trends":
      return {
        kind: "trends" as const,
        college,
        program,
        data: await getProgramHeadTrends(...args),
      };
    case "feedback":
      return {
        kind: "feedback" as const,
        college,
        program,
        data: await getProgramHeadFeedback(...args),
      };
  }
}
export type DeanEvidence = NonNullable<Awaited<ReturnType<typeof getDeanEvidence>>>;

async function deanAlignmentState(
  periods: Array<{ id: string; status: string }>,
  periodId: string | undefined,
  programId: string
) {
  const period = periods.find((row) => row.id === periodId);
  const alignmentBasis =
    period?.status === "COMPLETED"
      ? "Completed-period immutable snapshot"
      : "Live active-period readiness";
  if (!period || (period.status !== "ACTIVE" && period.status !== "COMPLETED"))
    return { alignment: null, alignmentUnavailable: false, alignmentBasis };
  try {
    const readiness = await getDeanLearningOutcomes(period.id);
    return {
      alignment:
        readiness.state === "ready"
          ? (readiness.data.programs.find((row) => row.id === programId) ?? null)
          : null,
      alignmentUnavailable: false,
      alignmentBasis,
    };
  } catch {
    return { alignment: null, alignmentUnavailable: true, alignmentBasis };
  }
}
