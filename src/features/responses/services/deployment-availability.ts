import { DeploymentStatus } from "@prisma/client";

/**
 * The availability window every answering surface gates on.
 *
 * A deployment is answerable only while ACTIVE or SCHEDULED and activation time
 * <= now <= deadline; a null bound imposes no limit. Course-bound and central
 * student deployments share this one gate.
 */

type DeploymentAvailabilityInput = {
  activation_at: Date | null;
  deadline_at: Date | null;
  status: DeploymentStatus;
};

export const DEPLOYMENT_UNAVAILABLE_ERROR = "This evaluation is not currently available.";

export function isDeploymentAvailable(
  deployment: DeploymentAvailabilityInput,
  now = new Date()
): boolean {
  if (
    deployment.status !== DeploymentStatus.ACTIVE &&
    deployment.status !== DeploymentStatus.SCHEDULED
  ) {
    return false;
  }

  if (deployment.activation_at && deployment.activation_at.getTime() > now.getTime()) {
    return false;
  }

  if (deployment.deadline_at && deployment.deadline_at.getTime() < now.getTime()) {
    return false;
  }

  return true;
}
