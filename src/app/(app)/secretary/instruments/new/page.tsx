import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ManagementTemplateBuilder } from "@/features/instruments/components/management-template-builder";
import { createAdminTemplateAction } from "@/lib/actions/admin-template-actions";

export default function SecretaryCreateTemplatePage() {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/secretary/instruments"
        className="text-link inline-flex items-center gap-2 text-sm font-medium hover:underline"
      >
        <ArrowLeft className="size-4" />
        Back to Tools
      </Link>

      <ManagementTemplateBuilder
        onSave={createAdminTemplateAction}
        programLabel="Institutional Baseline"
        toolsHref="/secretary/instruments"
      />
    </div>
  );
}
