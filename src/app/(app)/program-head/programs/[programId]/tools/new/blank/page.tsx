import { ProgramHeadTemplateBuilder } from "@/features/instruments/components/program-head-template-builder";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { listProgramPoOptions } from "@/features/instruments/services/manage-program-head-templates";
import { notFound } from "next/navigation";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("New Template", "Program Head") };

export default async function NewSelectedProgramBlankToolPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const contextResult = await resolveProgramHeadContext(programId);
  if (!contextResult.success) notFound();

  const poOptionsResult = await listProgramPoOptions(programId);

  return (
    <ProgramHeadTemplateBuilder
      programId={programId}
      poOptions={poOptionsResult.success ? poOptionsResult.data.pos : []}
      programLabel={`${contextResult.data.selectedProgram.code} — ${contextResult.data.selectedProgram.name}`}
    />
  );
}
