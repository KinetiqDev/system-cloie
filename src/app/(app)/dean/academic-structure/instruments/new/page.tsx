import { ManagementTemplateBuilder } from "@/features/instruments/components/management-template-builder";
import { createDeanTemplateAction } from "@/lib/actions/dean-template-actions";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("New Instrument", "Dean") };

export default function DeanCreateTemplatePage() {
  return (
    <ManagementTemplateBuilder
      onSave={createDeanTemplateAction}
      programLabel="Institutional Baseline"
      toolsHref="/dean/academic-structure/instruments"
    />
  );
}
