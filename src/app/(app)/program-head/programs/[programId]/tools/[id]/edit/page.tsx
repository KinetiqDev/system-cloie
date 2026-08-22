import { notFound } from "next/navigation";
import { ProgramHeadTemplateBuilder } from "@/features/instruments/components/program-head-template-builder";
import { getProgramHeadTemplate } from "@/features/instruments/services/manage-program-head-templates";
import type { TemplateStructure } from "@/features/instruments/types";

export default async function EditSelectedProgramToolPage({
  params,
}: {
  params: Promise<{ programId: string; id: string }>;
}) {
  const { programId, id } = await params;
  const result = await getProgramHeadTemplate(programId, id);
  if (!result.success) notFound();

  const { template, program, ploOptions } = result.data;

  return (
    <ProgramHeadTemplateBuilder
      programId={programId}
      isInstitutionalBaseline={template.program_id === null}
      initialData={{
        id: template.id,
        name: template.name,
        description: template.description ?? "",
        template_type: template.template_type,
        is_active: template.is_active,
        is_faculty_accessible: template.is_faculty_accessible,
        structure: template.structure as TemplateStructure,
      }}
      ploOptions={ploOptions}
      initialPloBindings={template.ploBindings}
      programLabel={`${program.code} — ${program.name}`}
    />
  );
}
