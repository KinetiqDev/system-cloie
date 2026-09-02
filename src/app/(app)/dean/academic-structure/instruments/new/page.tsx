import { ManagementTemplateBuilder } from "@/features/instruments/components/management-template-builder";
import { createDeanTemplateAction } from "@/lib/actions/dean-template-actions";

export default function DeanCreateTemplatePage() {
  return (
    <ManagementTemplateBuilder
      onSave={createDeanTemplateAction}
      programLabel="Institutional Baseline"
      toolsHref="/dean/academic-structure/instruments"
    />
  );
}
