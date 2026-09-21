import { notFound } from "next/navigation";

import { ProgramHeadTemplateBuilder } from "@/features/instruments/components/program-head-template-builder";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { getInstitutionalBaseline } from "@/features/instruments/services/list-institutional-baselines";
import { listProgramGoOptions } from "@/features/instruments/services/manage-program-head-templates";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("New Template", "Program Head") };

export default async function NewSelectedProgramToolFromBaselinePage({
  params,
}: {
  params: Promise<{ programId: string; baselineId: string }>;
}) {
  const { programId, baselineId } = await params;
  const [contextResult, baseline, goOptionsResult] = await Promise.all([
    resolveProgramHeadContext(programId),
    getInstitutionalBaseline(baselineId),
    listProgramGoOptions(programId),
  ]);

  if (!contextResult.success || !baseline) notFound();

  const program = contextResult.data.selectedProgram;

  return (
    <ProgramHeadTemplateBuilder
      programId={programId}
      goOptions={goOptionsResult.success ? goOptionsResult.data.gos : []}
      programLabel={`${program.code} — ${program.name}`}
      startingFrom={{
        id: baseline.id,
        name: baseline.name,
        origin: "institutional-baseline",
      }}
      initialData={{
        description: baseline.description ?? "",
        is_active: true,
        is_faculty_accessible: baseline.is_faculty_accessible,
        name: baseline.name,
        structure: baseline.structure,
        template_type: baseline.template_type,
      }}
    />
  );
}
