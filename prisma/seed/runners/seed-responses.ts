import { DeploymentType } from "@prisma/client";
import { prisma } from "../../../src/lib/db/prisma";
import { U } from "../constants/ids";
import { responseSequences } from "../fixtures/responses";
import { ensureResponse, seedQualItems, seedQuantItems } from "../helpers/responses";
import type { EvaluationContext } from "../types";

export async function seedResponses({ cbEval1, cbEval2, newCbEvals }: EvaluationContext) {
  console.log("  → Responses...");

  for (const seq of responseSequences) {
    console.log(seq.log);

    const { deploymentId, deploymentType, where } = resolveDeployment(seq, {
      cbEval1,
      cbEval2,
      newCbEvals,
    });

    const asgn = await prisma.evaluationAssignment.findFirstOrThrow({ where });
    const resp = await ensureResponse({
      assignmentId: asgn.id,
      respondentId: U[seq.respondentKey],
      deploymentType,
      deploymentId,
      status: seq.status,
      submittedAt: seq.submittedAt ? new Date(seq.submittedAt) : undefined,
    });
    if (seq.quantItems.length > 0) {
      await seedQuantItems(resp.id, seq.quantItems);
    }
    if (seq.qualItems.length > 0) {
      await seedQualItems(resp.id, seq.qualItems);
    }
  }
}

function resolveDeployment(
  seq: (typeof responseSequences)[number],
  { cbEval1, cbEval2, newCbEvals }: { cbEval1: { id: string }; cbEval2: { id: string }; newCbEvals: Map<string, { id: string }> }
): { deploymentId: string; deploymentType: DeploymentType; where: { course_bound_id?: string; central_deployment_id?: string; respondent_id: string } } {
  const respondentId = U[seq.respondentKey];
  if (seq.deploymentKey.kind === "central") {
    return {
      deploymentId: seq.deploymentKey.id,
      deploymentType: DeploymentType.CENTRAL,
      where: { central_deployment_id: seq.deploymentKey.id, respondent_id: respondentId },
    };
  }
  if (seq.deploymentKey.kind === "newCb") {
    const id = newCbEvals.get(seq.deploymentKey.courseCode)!.id;
    return {
      deploymentId: id,
      deploymentType: DeploymentType.COURSE_BOUND,
      where: { course_bound_id: id, respondent_id: respondentId },
    };
  }
  if (seq.deploymentKey.kind === "cb1") {
    return {
      deploymentId: cbEval1.id,
      deploymentType: DeploymentType.COURSE_BOUND,
      where: { course_bound_id: cbEval1.id, respondent_id: respondentId },
    };
  }
  // cb2
  return {
    deploymentId: cbEval2.id,
    deploymentType: DeploymentType.COURSE_BOUND,
    where: { course_bound_id: cbEval2.id, respondent_id: respondentId },
  };
}
