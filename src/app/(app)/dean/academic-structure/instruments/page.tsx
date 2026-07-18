import { listBaselineTemplates } from "@/features/instruments/services/manage-instruments";
import { ManagementToolsPage } from "@/features/instruments/components/management-tools-page";
import {
  toggleDeanTemplateActiveAction,
  duplicateDeanTemplateAction,
  deleteDeanTemplateAction,
} from "@/lib/actions/dean-template-actions";

export default async function DeanInstrumentsPage() {
  const templates = await listBaselineTemplates();
  return (
    <ManagementToolsPage
      templates={JSON.parse(JSON.stringify(templates))}
      basePath="/dean/academic-structure/instruments"
      actions={{
        onToggleActive: toggleDeanTemplateActiveAction,
        onDuplicate: duplicateDeanTemplateAction,
        onDelete: deleteDeanTemplateAction,
      }}
    />
  );
}
