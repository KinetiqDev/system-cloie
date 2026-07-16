import { listDeanEligiblePeriods } from "@/features/dean/services/read-dean-oversight";
import { deanJson, handleDeanReadError, requireDean, DeanRouteBadRequestError } from "../route-helpers";

export async function GET(request: Request): Promise<Response> {
  const authError = await requireDean();
  if (authError) return authError;
  try {
    if ([...new URL(request.url).searchParams.keys()].length > 0) {
      throw new DeanRouteBadRequestError("Eligible periods do not accept query parameters.");
    }
    return deanJson({ periods: await listDeanEligiblePeriods() });
  } catch (error) {
    return handleDeanReadError(error, "eligible periods");
  }
}
