import { getYearLevelDisplay } from "@/lib/constants/year-levels";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import {
  buildSubmittedResponseSections,
  type SubmittedResponseSection,
} from "./get-student-submitted-response-review";
import { mapSavedAnswerItems } from "./map-saved-answer-items";

// ─── Public types ───────────────────────────────────────────────────────────

export type CentralDeploymentSubmittedReview = {
  responseId: string;
  evaluationTitle: string;
  courseTitle: null;
  programLabel: string;
  submittedAt: Date;
  sections: SubmittedResponseSection[];
};

// ─── Internal helpers ───────────────────────────────────────────────────────

function buildProgramLabel(input: {
  majorName: string | null;
  programCode: string | null;
  programName: string | null;
  yearLevelName: string | null;
}): string {
  return (
    [input.programCode ?? input.programName ?? "Program-wide", input.majorName, input.yearLevelName]
      .filter((value): value is string => Boolean(value))
      .join(" • ") || "College-wide"
  );
}

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * Read-only view of a submitted central deployment response.
 *
 * Works for any stakeholder type (ALUMNI, INDUSTRY_PARTNER, STUDENT).
 * Authenticates via session — only the respondent who submitted the response
 * can view it.
 */
export async function getCentralDeploymentSubmittedReview(
  responseId: string
): Promise<CentralDeploymentSubmittedReview | null> {
  const authSession = await resolveAuthSession();

  if (!authSession) {
    return null;
  }

  const response = await prisma.response.findFirst({
    where: {
      id: responseId,
      respondent_id: authSession.userId,
      status: "SUBMITTED",
      deployment_type: "CENTRAL",
    },
    include: {
      assignment: {
        include: {
          central_deployment: {
            include: {
              instrument: {
                include: {
                  template: true,
                },
              },
              major: true,
              program: true,
            },
          },
        },
      },
      qual_items: true,
      quant_items: true,
    },
  });

  if (!response?.submitted_at || !response.assignment.central_deployment) {
    return null;
  }

  const deployment = response.assignment.central_deployment;

  const answers = mapSavedAnswerItems({
    qualitativeItems: response.qual_items,
    quantitativeItems: response.quant_items,
  });

  return {
    responseId: response.id,
    evaluationTitle: deployment.deployment_name ?? deployment.instrument.template.name,
    courseTitle: null,
    programLabel: buildProgramLabel({
      majorName: deployment.major?.name ?? null,
      programCode: deployment.program?.code ?? null,
      programName: deployment.program?.name ?? null,
      yearLevelName: deployment.year_level ? getYearLevelDisplay(deployment.year_level) : null,
    }),
    submittedAt: response.submitted_at,
    sections: buildSubmittedResponseSections({
      answers,
      structureSnapshot: deployment.instrument.structure_snapshot,
    }),
  };
}
