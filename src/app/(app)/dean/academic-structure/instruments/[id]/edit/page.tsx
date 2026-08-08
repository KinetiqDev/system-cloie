import { notFound } from "next/navigation";
import Link from "next/link";
import { ManagementTemplateBuilder } from "@/features/instruments/components/management-template-builder";
import { updateDeanTemplateAction } from "@/lib/actions/dean-template-actions";
import { getBaselineTemplate } from "@/features/instruments/services/manage-instruments";
import type { TemplateStructure } from "@/features/instruments/types";

export default async function DeanEditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const template = await getBaselineTemplate((await params).id);
  if (!template) notFound();
  return <div className="space-y-6"><Link href="/dean/academic-structure/instruments" className="text-link inline-flex min-h-11 items-center">Back to Instruments</Link><ManagementTemplateBuilder initialData={{ id: template.id, name: template.name, description: template.description ?? "", template_type: template.template_type, is_active: template.is_active, is_faculty_accessible: template.is_faculty_accessible, structure: template.structure as unknown as TemplateStructure }} onSave={updateDeanTemplateAction} programLabel="Institutional Baseline" toolsHref="/dean/academic-structure/instruments" /></div>;
}
