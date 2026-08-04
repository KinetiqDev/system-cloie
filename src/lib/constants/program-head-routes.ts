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

export function buildProgramHeadCoursesPath(programId: string): string {
  return buildProgramHeadProgramPath(programId, "courses");
}

export function buildProgramHeadCourseAssignmentsPath(programId: string): string {
  return buildProgramHeadProgramPath(programId, "course-assignments");
}

export function buildProgramHeadCourseRosterPath(programId: string, assignmentId: string): string {
  return buildProgramHeadProgramPath(
    programId,
    `course-rosters/${encodeURIComponent(assignmentId)}`
  );
}

export function buildProgramHeadToolsPath(
  programId: string,
  tab?: "templates" | "published"
): string {
  const path = buildProgramHeadProgramPath(programId, "tools");
  return tab ? `${path}?tab=${tab}` : path;
}

export function buildProgramHeadNewToolPath(programId: string): string {
  return buildProgramHeadProgramPath(programId, "tools/new");
}

export function buildProgramHeadEditToolPath(programId: string, templateId: string): string {
  return buildProgramHeadProgramPath(programId, `tools/${encodeURIComponent(templateId)}/edit`);
}

export function buildProgramHeadPublishToolPath(programId: string, templateId?: string): string {
  const path = buildProgramHeadProgramPath(programId, "tools/publish");
  return templateId ? `${path}?templateId=${encodeURIComponent(templateId)}` : path;
}

export function buildProgramHeadNewCiloEvaluationPath(programId: string): string {
  return buildProgramHeadProgramPath(programId, "cilo-evaluations/new");
}

export function buildProgramHeadCiloReviewsPath(programId: string): string {
  return buildProgramHeadProgramPath(programId, "cilo-reviews");
}

export function buildProgramHeadCiloReviewDetailPath(
  programId: string,
  evaluationId: string
): string {
  return buildProgramHeadProgramPath(programId, `cilo-reviews/${encodeURIComponent(evaluationId)}`);
}

export function buildProgramHeadCiloResponseReviewPath(
  programId: string,
  evaluationId: string,
  responseId: string
): string {
  return buildProgramHeadProgramPath(
    programId,
    `cilo-reviews/${encodeURIComponent(evaluationId)}/responses/${encodeURIComponent(responseId)}`
  );
}
