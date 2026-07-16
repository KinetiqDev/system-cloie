import { listSecretaryProgramsSummary } from "@/features/academic-structure/services/list-secretary-programs-summary";
import { SecretaryProgramsList } from "@/features/academic-structure/components/secretary-programs-list";

export default async function DeanProgramsPage() {
  const { programs, kpi } = await listSecretaryProgramsSummary();
  return <SecretaryProgramsList programs={programs} kpi={kpi} basePath="/dean/academic-structure/programs" />;
}
