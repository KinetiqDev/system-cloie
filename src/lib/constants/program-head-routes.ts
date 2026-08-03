export const PROGRAM_HEAD_ENTRY_PATH = "/program-head";

export function buildProgramHeadDashboardPath(programId: string): string {
  return `${PROGRAM_HEAD_ENTRY_PATH}/programs/${encodeURIComponent(programId)}/dashboard`;
}

export function buildProgramHeadProgramPath(programId: string, childPath = ""): string {
  const normalizedChildPath = childPath.replace(/^\/+/, "");
  const basePath = `${PROGRAM_HEAD_ENTRY_PATH}/programs/${encodeURIComponent(programId)}`;

  return normalizedChildPath ? `${basePath}/${normalizedChildPath}` : basePath;
}

export function buildProgramHeadOutcomesPath(programId: string): string {
  return buildProgramHeadProgramPath(programId, "outcomes");
}

export function buildProgramHeadOutcomeMappingPath(programId: string): string {
  return buildProgramHeadProgramPath(programId, "outcomes/mapping");
}
