import type { YearLevel } from "@prisma/client";
import { getYearLevelDisplay } from "@/lib/constants/year-levels";

type CentralDeploymentScope = {
  major?: { name: string } | null;
  program?: { code: string; name: string } | null;
  year_level?: YearLevel | null;
};

/** Respondent-facing scope line for a Central deployment: `BSIT • Major • 4th Year`. */
export function buildCentralProgramLabel(deployment: CentralDeploymentScope): string {
  return [
    deployment.program?.code ?? deployment.program?.name ?? "Program-wide",
    deployment.major?.name,
    deployment.year_level ? getYearLevelDisplay(deployment.year_level) : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" • ");
}
