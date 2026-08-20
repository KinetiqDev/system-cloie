import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { buildStudentEvaluationAnswerKey } from "@/features/responses/answer-keys";
import type {
  StudentEvaluationSection,
  StudentEvaluationSession,
} from "@/features/responses/types";
import { isCentralDeploymentAvailable } from "./central-deployment-availability";
import { mapTemplateStructureToSections } from "./map-template-structure";

// ─── Internal helpers ───────────────────────────────────────────────────────

type QuantitativeSavedAnswerItem = {
  item_key: string;
  rating_value: number;
  section_key: string;
};

type QualitativeSavedAnswerItem = {
  prompt_key: string;
  section_key: string;
  text_content: string;
};

function mapSavedAnswerItems({
  qualitativeItems,
  quantitativeItems,
}: {
  qualitativeItems: QualitativeSavedAnswerItem[];
  quantitativeItems: QuantitativeSavedAnswerItem[];
}): Record<string, number | string> {
  const answers: Record<string, number | string> = {};

  for (const item of quantitativeItems) {
    answers[buildStudentEvaluationAnswerKey(item.section_key, "quantitative", item.item_key)] =
      item.rating_value;
  }

  for (const item of qualitativeItems) {
    answers[buildStudentEvaluationAnswerKey(item.section_key, "qualitative", item.prompt_key)] =
      item.text_content;
  }

  return answers;
}

function countSectionItems(sections: StudentEvaluationSection[]) {
  return sections.reduce((total, section) => total + section.items.length, 0);
}

function buildProgramLabel(input: {
  majorName: string | null;
  programCode: string | null;
  programName: string | null;
}) {
  return (
    [input.programCode ?? input.programName, input.majorName]
      .filter((v): v is string => Boolean(v))
      .join(" • ") || "College-wide"
  );
}

function evaluationIsReadable(
  response: { submitted_at: Date | null } | null,
  deployment: {
    activation_at: Date | null;
    deadline_at: Date | null;
    status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "CLOSED" | "ARCHIVED";
  }
): boolean {
  // Keep submitted evaluations readable after the deployment window closes.
  // Only the wizard needs the availability gate; review pages must not 404
  // on an answered evaluation.
  return Boolean(response?.submitted_at) || isCentralDeploymentAvailable(deployment);
}

// ─── Public types ───────────────────────────────────────────────────────────

export type CentralDeploymentEvaluationSession = {
  assignmentId: string;
  evaluationTitle: string;
  programLabel: string;
  sections: StudentEvaluationSection[];
  savedAnswers: Record<string, number | string>;
  session: StudentEvaluationSession;
};

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * Load an assigned central deployment evaluation for the current respondent.
 *
 * 1. Authenticates via `resolveAuthSession()`
 * 2. Finds `EvaluationAssignment` where `central_deployment_id = deploymentId`
 *    AND `respondent_id = session.userId`
 * 3. Verifies deployment availability
 * 4. Maps `structure_snapshot` to wizard sections
 * 5. Loads existing response + items (if any)
 * 6. Returns the session DTO or `null` if unauthorized / unavailable
 */
export async function getCentralDeploymentEvaluationSession(
  deploymentId: string
): Promise<CentralDeploymentEvaluationSession | null> {
  const authSession = await resolveAuthSession();

  if (!authSession) {
    return null;
  }

  // Find assignment linking this respondent to the deployment
  const assignment = await prisma.evaluationAssignment.findFirst({
    where: {
      central_deployment_id: deploymentId,
      respondent_id: authSession.userId,
    },
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
      response: {
        include: {
          qual_items: true,
          quant_items: true,
        },
      },
    },
  });

  if (!assignment?.central_deployment) {
    return null;
  }

  const deployment = assignment.central_deployment;

  // Keep submitted evaluations readable after the deployment window closes.
  // Only the wizard needs the availability gate; review pages must not 404
  // on an answered evaluation.
  const response = assignment.response ?? null;
  if (!evaluationIsReadable(response, deployment)) {
    return null;
  }

  // Map template structure to wizard sections
  const sections = mapTemplateStructureToSections(deployment.instrument.structure_snapshot);

  // Load saved answers from existing response (if any)
  const savedAnswers = response
    ? mapSavedAnswerItems({
        qualitativeItems: response.qual_items,
        quantitativeItems: response.quant_items,
      })
    : {};
  const answeredItems = response ? response.qual_items.length + response.quant_items.length : 0;

  return {
    assignmentId: assignment.id,
    evaluationTitle: deployment.deployment_name ?? deployment.instrument.template.name,
    programLabel: buildProgramLabel({
      majorName: deployment.major?.name ?? null,
      programCode: deployment.program?.code ?? null,
      programName: deployment.program?.name ?? null,
    }),
    sections,
    savedAnswers,
    session: {
      responseId: response?.id ?? null,
      answeredItems,
      totalItems: countSectionItems(sections),
      submittedAt: response?.submitted_at ?? null,
    },
  };
}
