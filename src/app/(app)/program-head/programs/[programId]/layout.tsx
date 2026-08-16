import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ProgramHeadContextHeader } from "@/features/auth/components/program-head-context-header";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";

export default async function SelectedProgramLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const result = await resolveProgramHeadContext(programId);

  if (!result.success) {
    notFound();
  }

  return (
    <>
      <ProgramHeadContextHeader program={result.data.selectedProgram} />
      {children}
    </>
  );
}
