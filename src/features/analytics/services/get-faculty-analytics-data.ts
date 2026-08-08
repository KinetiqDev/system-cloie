import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";
import { eng } from "stopword";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import type {
  FacultyAnalyticsData,
  FacultyCiloMetric,
  FacultyQuantitativeQuestion,
  GetFacultyAnalyticsDataResult,
  WordCloudToken,
} from "../types";
import { getSnapshotSectionItems, isSnapshotSection } from "./snapshot-structure";

const nlp = winkNLP(model);
const stopWords = new Set(eng);

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function buildWordCloudTokens(texts: string[]): WordCloudToken[] {
  const counts = new Map<string, number>();

  for (const text of texts) {
    const tokens = nlp.readDoc(text).tokens().out(nlp.its.normal) as string[];

    for (const token of tokens) {
      const normalized = token.toLowerCase();

      if (!/^[a-z][a-z-]*$/.test(normalized)) {
        continue;
      }

      if (stopWords.has(normalized)) {
        continue;
      }

      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([text, value]) => ({ text, value }))
    .sort((left, right) => {
      if (right.value !== left.value) {
        return right.value - left.value;
      }
      return left.text.localeCompare(right.text);
    });
}

export async function getFacultyAnalyticsData(
  evaluationIds: string[]
): Promise<GetFacultyAnalyticsDataResult> {
  const session = await resolveAuthSession();

  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  if (session.activeRole !== ROLES.FACULTY) {
    return { success: false, error: "Faculty access required" };
  }

  if (evaluationIds.length === 0) {
    return { success: true, data: [] };
  }

  try {
    const evaluations = await prisma.courseBoundEvaluation.findMany({
      where: {
        id: { in: evaluationIds },
        course_assignment: { faculty_id: session.userId },
      },
      include: {
        course_assignment: {
          select: {
            course: {
              select: {
                title: true,
              },
            },
            program: {
              select: {
                name: true,
              },
            },
          },
        },
        assignments: {
          include: {
            response: {
              include: {
                quant_items: true,
                qual_items: true,
              },
            },
          },
        },
        cilo_question_bindings: {
          orderBy: { created_at: "asc" },
        },
        instrument: {
          include: {
            template: true,
          },
        },
        _count: {
          select: {
            assignments: true,
          },
        },
        term_instance: {
          include: {
            school_year: true,
          },
        },
      },
    });

    const data: FacultyAnalyticsData[] = evaluations.map((evaluation) => {
      // Get submitted responses only
      const submittedResponses = evaluation.assignments
        .map((a) => a.response)
        .filter((r): r is NonNullable<typeof r> => r?.status === "SUBMITTED");

      const responseCount = submittedResponses.length;
      const totalAssignments = evaluation._count.assignments;

      // Aggregate all quantitative ratings
      const allQuantRatings = submittedResponses.flatMap((r) =>
        r.quant_items.map((item) => item.rating_value)
      );

      // Aggregate qualitative texts
      const qualitativeTexts = submittedResponses
        .flatMap((r) => r.qual_items.map((item) => item.text_content))
        .filter((text) => text.trim().length > 0);

      // Calculate CILO metrics
      const ciloMetrics: FacultyCiloMetric[] = evaluation.cilo_question_bindings.map(
        (binding, index) => {
          const values = submittedResponses
            .flatMap((r) => r.quant_items)
            .filter(
              (item) =>
                item.cilo_question_binding_id === binding.id ||
                (!item.cilo_question_binding_id &&
                  item.section_key === binding.section_key &&
                  item.item_key === binding.item_key)
            )
            .map((item) => item.rating_value);

          return {
            ciloId: binding.cilo_id,
            ciloLabel: `CILO ${index + 1}`,
            ciloDescription: binding.cilo_description_snapshot,
            bindingId: binding.id,
            mean: mean(values),
            responseCount: values.length,
          };
        }
      );

      // Calculate per-question metrics from structure snapshot
      const structure = evaluation.instrument.structure_snapshot;

      const quantitativeQuestions: FacultyQuantitativeQuestion[] = [];

      if (Array.isArray(structure)) {
        const sections = structure.filter(isSnapshotSection);

        for (const section of sections) {
          const items = getSnapshotSectionItems(section);
          const quantitativeItems = items.filter((item) => item.kind === "quantitative");

          for (const item of quantitativeItems) {
            const values = submittedResponses
              .flatMap((r) => r.quant_items)
              .filter((qi) => qi.section_key === section.key && qi.item_key === item.key)
              .map((qi) => qi.rating_value);

            if (values.length > 0) {
              quantitativeQuestions.push({
                sectionKey: section.key,
                sectionTitle: section.title,
                itemKey: item.key,
                prompt: item.prompt,
                mean: mean(values),
                min: Math.min(...values),
                max: Math.max(...values),
                responseCount: values.length,
              });
            }
          }
        }
      }

      const ti = evaluation.term_instance;
      const termLabel = ti.term ? `${ti.term}` : "";
      const termInstanceLabel = termLabel
        ? `${ti.school_year.code} — ${ti.semester} — ${termLabel}`
        : `${ti.school_year.code} — ${ti.semester}`;

      const ca = evaluation.course_assignment;

      return {
        evaluationId: evaluation.id,
        deploymentName: evaluation.deployment_name,
        courseTitle: ca.course.title,
        programName: ca.program.name,
        termInstanceLabel,
        status: evaluation.status,
        overallMean: mean(allQuantRatings),
        responseCount,
        totalAssignments,
        ciloMetrics,
        quantitativeQuestions,
        qualitativeItemCount: qualitativeTexts.length,
        wordCloudTokens: buildWordCloudTokens(qualitativeTexts),
      };
    });

    return { success: true, data };
  } catch (error) {
    console.error("getFacultyAnalyticsData error:", error);
    return { success: false, error: "Failed to load analytics data" };
  }
}
