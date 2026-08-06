import { ProgramHeadTemplateBuilder } from "@/features/instruments/components/program-head-template-builder";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { notFound } from "next/navigation";

export default async function NewSelectedProgramToolPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const contextResult = await resolveProgramHeadContext(programId);
  if (!contextResult.success) notFound();

  return (
    <ProgramHeadTemplateBuilder
      programId={programId}
      programLabel={`${contextResult.data.selectedProgram.code} — ${contextResult.data.selectedProgram.name}`}
    />
  );
}
