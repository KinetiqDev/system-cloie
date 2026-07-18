import { getDeanLearningOutcomes } from "@/features/dean/services/read-dean-oversight";
import { assertAllowedQueryParameters, deanJson, handleDeanReadError, parseRequiredUuid, requireDean, DeanRouteBadRequestError } from "../route-helpers";

const RISKS = new Set(["missing-cilos", "incomplete-mappings", "not-ready"]);

export async function GET(request: Request): Promise<Response> {
  const authError = await requireDean();
  if (authError) return authError;
  try {
    const { searchParams } = new URL(request.url);
    assertAllowedQueryParameters(searchParams, ["period", "risk"]);
    const periodValue = searchParams.get("period");
    const period = periodValue === null ? undefined : parseRequiredUuid(periodValue, "period");
    const riskValue = searchParams.get("risk");
    if (riskValue !== null && !RISKS.has(riskValue)) {
      throw new DeanRouteBadRequestError("Invalid risk.");
    }
    return deanJson(await getDeanLearningOutcomes(period, riskValue as "missing-cilos" | "incomplete-mappings" | "not-ready" | null));
  } catch (error) {
    return handleDeanReadError(error, "learning outcomes");
  }
}
