import { DeploymentType, ResponseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import type { StudentEvaluationSection } from "@/features/responses/types";
import { isCentralDeploymentAvailable } from "./central-deployment-availability";
import { CENTRAL_DEPLOYMENT_UNAVAILABLE_ERROR } from "./central-deployment-availability";
import { buildQualitativeUpserts, buildQuantitativeUpserts } from "./build-draft-upserts";
import { mapTemplateStructureToSections } from "./map-template-structure";

// ─── Public types ───────────────────────────────────────────────────────────

export type SaveCentralDeploymentDraftInput = {
  assignmentId: string;
  sectionKey: string;
  answers: Record<string, unknown>;
};

export type SaveCentralDeploymentDraftResult =
  | {
      error: string;
      success: false;
    }
  | {
      responseId: string;
      savedAt: string;
      success: true;
    };

// ─── Internal helpers ───────────────────────────────────────────────────────

function resolveSection(
  structureSnapshot: unknown,
  sectionKey: string
): StudentEvaluationSection | null {
  return (
    mapTemplateStructureToSections(structureSnapshot).find((entry) => entry.id === sectionKey) ??
    null
  );
}

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * Save partial answers for a central deployment response.
 *
 * Works for any stakeholder type (ALUMNI, INDUSTRY_PARTNER, GRADUATING_STUDENT).
 * Authenticates via session — the respondent must have an assignment linking
 * them to the deployment.
 */
export async function saveCentralDeploymentDraft({
  assignmentId,
  answers,
  sectionKey,
}: SaveCentralDeploymentDraftInput): Promise<SaveCentralDeploymentDraftResult> {
  const authSession = await resolveAuthSession();

  if (!authSession) {
    return {
      error: "Authentication is required.",
      success: false,
    };
  }

  const assignment = await prisma.evaluationAssignment.findFirst({
    where: {
      id: assignmentId,
      respondent_id: authSession.userId,
      central_deployment_id: { not: null },
    },
    include: {
      central_deployment: {
        include: {
          instrument: true,
        },
      },
    },
  });

  if (!assignment?.central_deployment) {
    return {
      error: "Evaluation assignment not found.",
      success: false,
    };
  }

  if (!isCentralDeploymentAvailable(assignment.central_deployment)) {
    return {
      error: CENTRAL_DEPLOYMENT_UNAVAILABLE_ERROR,
      success: false,
    };
  }

  const section = resolveSection(
    assignment.central_deployment.instrument.structure_snapshot,
    sectionKey
  );

  if (!section) {
    return {
      error: `Unknown section ${sectionKey}.`,
      success: false,
    };
  }

  let response = await prisma.response.findUnique({
    where: {
      assignment_id: assignment.id,
    },
  });

  if (response?.status === ResponseStatus.SUBMITTED) {
    return {
      error: "This evaluation has already been submitted.",
      success: false,
    };
  }

  if (!response) {
    response = await prisma.response.create({
      data: {
        assignment_id: assignment.id,
        deployment_id: assignment.central_deployment_id!,
        deployment_type: DeploymentType.CENTRAL,
        respondent_id: authSession.userId,
        status: ResponseStatus.IN_PROGRESS,
      },
    });
  }

  const updatedAt = new Date().toISOString();
  const quantitativeUpserts = buildQuantitativeUpserts({
    answers,
    responseId: response.id,
    section,
    updatedAt,
  });
  const qualitativeUpserts = buildQualitativeUpserts({
    answers,
    responseId: response.id,
    section,
    updatedAt,
  });

  await prisma.quantitativeResponseItem.deleteMany({
    where: {
      response_id: response.id,
      section_key: section.id,
    },
  });
  await prisma.qualitativeResponseItem.deleteMany({
    where: {
      response_id: response.id,
      section_key: section.id,
    },
  });

  if (quantitativeUpserts.length > 0) {
    await prisma.quantitativeResponseItem.createMany({
      data: quantitativeUpserts,
    });
  }

  if (qualitativeUpserts.length > 0) {
    await prisma.qualitativeResponseItem.createMany({
      data: qualitativeUpserts,
    });
  }

  return {
    responseId: response.id,
    savedAt: updatedAt,
    success: true,
  };
}
