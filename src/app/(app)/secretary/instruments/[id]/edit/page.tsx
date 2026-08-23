import { notFound } from "next/navigation";
import { ManagementTemplateBuilder } from "@/features/instruments/components/management-template-builder";
import { updateAdminTemplateAction } from "@/lib/actions/admin-template-actions";
import { getBaselineTemplate } from "@/features/instruments/services/manage-instruments";
import type { TemplateStructure } from "@/features/instruments/types";

interface SecretaryEditTemplatePageProps {
  params: Promise<{ id: string }>;
}

export default async function SecretaryEditTemplatePage({
  params,
}: SecretaryEditTemplatePageProps) {
  const { id } = await params;

  const template = await getBaselineTemplate(id);

  if (!template) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ManagementTemplateBuilder
        initialData={{
          id: template.id,
          name: template.name,
          description: template.description ?? "",
          template_type: template.template_type,
          is_active: template.is_active,
          is_faculty_accessible: template.is_faculty_accessible,
          structure: template.structure as unknown as TemplateStructure,
        }}
        onSave={updateAdminTemplateAction}
        programLabel="Institutional Baseline"
        toolsHref="/secretary/instruments"
      />
    </div>
  );
}
