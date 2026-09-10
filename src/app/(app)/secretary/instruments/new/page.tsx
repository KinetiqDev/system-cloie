import { ManagementTemplateBuilder } from "@/features/instruments/components/management-template-builder";
import { createAdminTemplateAction } from "@/lib/actions/admin-template-actions";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("New Instrument", "Secretary") };

export default function SecretaryCreateTemplatePage() {
  return (
    <div className="space-y-6">
      <ManagementTemplateBuilder
        onSave={createAdminTemplateAction}
        programLabel="Institutional Baseline"
        toolsHref="/secretary/instruments"
      />
    </div>
  );
}
