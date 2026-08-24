import { listBaselineTemplates } from "@/features/instruments/services/manage-instruments";
import { ManagementToolsPage } from "@/features/instruments/components/management-tools-page";
import {
  toggleDeanTemplateActiveAction,
  duplicateDeanTemplateAction,
  deleteDeanTemplateAction,
} from "@/lib/actions/dean-template-actions";

export default async function DeanInstrumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [templates, rawSearchParams] = await Promise.all([listBaselineTemplates(), searchParams]);

  return (
    <ManagementToolsPage
      templates={JSON.parse(JSON.stringify(templates))}
      basePath="/dean/academic-structure/instruments"
      actions={{
        onToggleActive: toggleDeanTemplateActiveAction,
        onDuplicate: duplicateDeanTemplateAction,
        onDelete: deleteDeanTemplateAction,
      }}
      initialView={rawSearchParams.view === "list" ? "list" : "card"}
    />
  );
}
