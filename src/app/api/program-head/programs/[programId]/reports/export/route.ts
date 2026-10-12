import { parseReportExportRequest } from "@/features/reports/services/report-export-state";
import { buildProgramHeadReportExport } from "@/features/reports/services/report-export";

// ---------------------------------------------------------------------------
// Program Head report download
//
// One route serves every export shape. It re-authorizes per request, applies
// private no-store transport headers, and never logs evidence: a failure logs
// the error type only.
// ---------------------------------------------------------------------------

const PRIVATE_DOWNLOAD_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
} as const;

function problem(status: number, error: string, extra?: Record<string, string>): Response {
  return Response.json(
    { error, ...extra },
    { status, headers: { ...PRIVATE_DOWNLOAD_HEADERS, "Content-Type": "application/json" } }
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ programId: string }> }
): Promise<Response> {
  const { programId } = await params;
  const exportRequest = parseReportExportRequest(new URL(request.url).searchParams);
  if (!exportRequest) {
    return problem(400, "This export request is not valid. Choose a report and its filters.");
  }

  try {
    const result = await buildProgramHeadReportExport(programId, exportRequest);
    if (!result.ok) {
      return problem(result.status, result.error, result.reason ? { reason: result.reason } : {});
    }

    return new Response(new Uint8Array(result.bytes), {
      status: 200,
      headers: {
        ...PRIVATE_DOWNLOAD_HEADERS,
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error("Program Head report export failed", {
      errorType: error instanceof Error ? error.name : typeof error,
      exportKind: exportRequest.kind,
    });
    return problem(500, "The report could not be generated. Try again.");
  }
}
