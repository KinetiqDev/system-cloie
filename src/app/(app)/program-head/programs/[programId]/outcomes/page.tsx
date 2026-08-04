import { notFound } from "next/navigation";
import { listProgramGOs } from "@/features/outcomes/services/manage-program-head-outcomes";
import { ProgramHeadOutcomesPage } from "@/features/outcomes/components/program-head-outcomes-page";

export const metadata = {
  title: "Graduate Outcomes | Program Head | CLOIE",
};

export default async function SelectedProgramOutcomesPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const result = await listProgramGOs(programId);

  if (!result.success) notFound();

  return <ProgramHeadOutcomesPage gos={result.data.gos} program={result.data.program} />;
}
