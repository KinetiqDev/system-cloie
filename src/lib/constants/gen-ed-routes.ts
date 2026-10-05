const GEN_ED_ENTRY_PATH = "/gen-ed-coordinator";

const GEN_ED_OUTCOMES_PATH = `${GEN_ED_ENTRY_PATH}/outcomes`;
const GEN_ED_OUTCOMES_MAPPING_PATH = `${GEN_ED_OUTCOMES_PATH}/mapping`;

export function buildGenEdOutcomesPath(): string {
  return GEN_ED_OUTCOMES_PATH;
}

export function buildGenEdOutcomeMappingPath(): string {
  return GEN_ED_OUTCOMES_MAPPING_PATH;
}

export const GEN_ED_ANALYTICS_PATH = `${GEN_ED_ENTRY_PATH}/analytics`;

export const GEN_ED_RESPONSES_PATH = `${GEN_ED_ENTRY_PATH}/responses`;

export function buildGenEdResponsesPath(): string {
  return GEN_ED_RESPONSES_PATH;
}

export function buildGenEdResponsesCourseEvaluationPath(evaluationId: string): string {
  return `${GEN_ED_RESPONSES_PATH}/course/${encodeURIComponent(evaluationId)}`;
}

export function buildGenEdResponsesCourseResponsePath(
  evaluationId: string,
  responseId: string
): string {
  return `${GEN_ED_RESPONSES_PATH}/course/${encodeURIComponent(evaluationId)}/responses/${encodeURIComponent(responseId)}`;
}
