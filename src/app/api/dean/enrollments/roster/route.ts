import { getDeanRoster } from "@/features/dean/services/read-dean-oversight";
import { assertAllowedQueryParameters, deanJson, handleDeanReadError, parseOptionalTrimmedQuery, parsePage, parseRequiredUuid, requireDean } from "../../route-helpers";

export async function GET(request: Request): Promise<Response> {
  const authError = await requireDean();
  if (authError) return authError;
  try {
    const { searchParams } = new URL(request.url);
    assertAllowedQueryParameters(searchParams, ["period", "assignment", "query", "page"]);
    return deanJson(await getDeanRoster({
      periodId: parseRequiredUuid(searchParams.get("period"), "period"),
      assignmentId: parseRequiredUuid(searchParams.get("assignment"), "assignment"),
      query: parseOptionalTrimmedQuery(searchParams.get("query")),
      page: parsePage(searchParams.get("page")),
    }));
  } catch (error) {
    return handleDeanReadError(error, "roster");
  }
}
