import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { PublishCentralDeploymentForm } from "@/features/evaluations/components/publish-central-deployment-form";
import { previewCentralDeploymentRespondentsAction, publishCentralDeploymentAction } from "@/lib/actions/central-deployment-actions";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { listProgramHeadTemplates } from "@/features/instruments/services/manage-program-head-templates";
import type { TermInstanceItem } from "@/features/academic-calendar/types";
import { YearLevel } from "@prisma/client";

export default async function PublishSelectedProgramToolPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string }>;
  searchParams: Promise<{ templateId?: string }>;
}) {
  const { programId } = await params;
  const { templateId } = await searchParams;
  const [contextResult, templatesResult, terms, majors] = await Promise.all([
    resolveProgramHeadContext(programId),
    listProgramHeadTemplates(programId),
    prisma.academicTermInstance.findMany({
      where: { school_year: { is_archived: false } },
      include: { school_year: true },
      orderBy: [{ school_year: { start_date: "desc" } }, { semester: "asc" }],
    }),
    prisma.major.findMany({
      where: { program_id: programId, is_active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!contextResult.success || !templatesResult.success) notFound();

  const termInstances: TermInstanceItem[] = terms.map((term) => ({
    id: term.id,
    schoolYearId: term.school_year_id,
    schoolYearCode: term.school_year.code,
    semester: term.semester,
    term: term.term,
    startDate: term.start_date,
    endDate: term.end_date,
    status: term.status,
    createdAt: term.created_at,
    updatedAt: term.updated_at,
  }));
  const activeTermId = termInstances.find((term) => term.status === "ACTIVE")?.id;
  const templates = templatesResult.data.templates
    .filter((template) => template.template_type === "PROGRAM_WIDE" && template.is_active)
    .map(({ id, name, code }) => ({ id, name, code }));

  return (
    <PublishCentralDeploymentForm
      templates={templates}
      yearLevels={Object.values(YearLevel)}
      majors={majors}
      programId={programId}
      programLabel={`${contextResult.data.selectedProgram.code} — ${contextResult.data.selectedProgram.name}`}
      preselectedTemplateId={templateId}
      termInstances={termInstances}
      activeTermId={activeTermId}
      previewAction={previewCentralDeploymentRespondentsAction}
      publishAction={publishCentralDeploymentAction}
    />
  );
}
