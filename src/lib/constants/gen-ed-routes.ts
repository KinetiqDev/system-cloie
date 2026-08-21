const GEN_ED_ENTRY_PATH = "/gen-ed-coordinator";

const GEN_ED_OUTCOMES_PATH = `${GEN_ED_ENTRY_PATH}/outcomes`;
const GEN_ED_OUTCOMES_MAPPING_PATH = `${GEN_ED_OUTCOMES_PATH}/mapping`;

export function buildGenEdOutcomesPath(): string {
  return GEN_ED_OUTCOMES_PATH;
}

export function buildGenEdOutcomeMappingPath(): string {
  return GEN_ED_OUTCOMES_MAPPING_PATH;
}
