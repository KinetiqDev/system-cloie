import { notFound } from "next/navigation";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { ProgramHeadResponsesLanding } from "@/features/analytics/components/program-head-responses-landing";
import { loadProgramHeadResponsesPage } from "@/features/analytics/services/load-program-head-responses-page";

export const metadata = { title: { absolute: "Responses | Program Head | System CLOIE" } };

export default async function SelectedProgramResponsesPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ programId }, rawSearchParams] = await Promise.all([params, searchParams]);
  const context = await resolveProgramHeadContext(programId);
  if (!context.success) notFound();
  const { state, data } = await loadProgramHeadResponsesPage({ programId, rawSearchParams });
  return (
    <ProgramHeadResponsesLanding
      programId={programId}
      program={context.data.selectedProgram}
      state={state}
      data={data}
    />
  );
}
