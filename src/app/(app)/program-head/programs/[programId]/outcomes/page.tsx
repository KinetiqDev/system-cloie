import { notFound } from "next/navigation";
import { listProgramPOs } from "@/features/outcomes/services/manage-program-head-outcomes";
import { ProgramHeadOutcomesPage } from "@/features/outcomes/components/program-head-outcomes-page";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = {
  title: buildPageTitle("Program Outcomes", "Program Head"),
};

export default async function SelectedProgramOutcomesPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const result = await listProgramPOs(programId);

  if (!result.success) notFound();

  return <ProgramHeadOutcomesPage pos={result.data.pos} program={result.data.program} />;
}
