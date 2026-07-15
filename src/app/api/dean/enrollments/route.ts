import { getDeanEnrollments } from "@/features/dean/services/read-dean-oversight";
import { assertAllowedQueryParameters, deanJson, handleDeanReadError, parseRequiredUuid, requireDean } from "../route-helpers";

export async function GET(request: Request): Promise<Response> {
  const authError = await requireDean();
  if (authError) return authError;
  try {
    const { searchParams } = new URL(request.url);
    assertAllowedQueryParameters(searchParams, ["period"]);
    const periodValue = searchParams.get("period");
    return deanJson(await getDeanEnrollments(periodValue === null ? undefined : parseRequiredUuid(periodValue, "period")));
  } catch (error) {
    return handleDeanReadError(error, "enrollments");
  }
}
