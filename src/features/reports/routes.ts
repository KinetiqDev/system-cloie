// ---------------------------------------------------------------------------
// Report export routes
//
// The download path is needed by the Client Component that triggers an export,
// so it lives outside the server-only `services/` layer: a client component that
// imports a route helper must never be able to reach Prisma.
// ---------------------------------------------------------------------------

/** Download route for one Program's report exports. */
export function buildReportExportPath(programId: string): string {
  return `/api/program-head/programs/${encodeURIComponent(programId)}/reports/export`;
}
