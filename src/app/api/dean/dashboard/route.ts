import { getDeanDashboard } from "@/features/dean/services/read-dean-oversight";
import { deanJson, handleDeanReadError, requireDean, DeanRouteBadRequestError } from "../route-helpers";

export async function GET(request: Request): Promise<Response> {
  const authError = await requireDean();
  if (authError) return authError;
  try {
    const { searchParams } = new URL(request.url);
    if ([...searchParams.keys()].length > 0) {
      throw new DeanRouteBadRequestError("Dashboard does not accept query parameters.");
    }
    return deanJson(await getDeanDashboard());
  } catch (error) {
    return handleDeanReadError(error, "dashboard");
  }
}
