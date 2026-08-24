import { listBaselineTemplates } from "@/features/instruments/services/manage-instruments";
import { ManagementToolsPage } from "@/features/instruments/components/management-tools-page";

export default async function SecretaryInstrumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [templates, rawSearchParams] = await Promise.all([listBaselineTemplates(), searchParams]);

  return (
    <ManagementToolsPage
      templates={JSON.parse(JSON.stringify(templates))}
      initialView={rawSearchParams.view === "list" ? "list" : "card"}
    />
  );
}
