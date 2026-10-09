import { notFound } from "next/navigation";

import {
  TemplateStartChooser,
  type TemplateStartSource,
} from "@/features/instruments/components/template-start-chooser";
import { listInstitutionalBaselines } from "@/features/instruments/services/list-institutional-baselines";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import {
  buildProgramHeadNewBlankToolPath,
  buildProgramHeadNewToolFromBaselinePath,
  buildProgramHeadToolsPath,
} from "@/lib/constants/program-head-routes";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("New Evaluation Template", "Program Head") };

export default async function NewSelectedProgramToolPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const [contextResult, baselines] = await Promise.all([
    resolveProgramHeadContext(programId),
    listInstitutionalBaselines(),
  ]);

  if (!contextResult.success) notFound();

  const program = contextResult.data.selectedProgram;
  const sources: TemplateStartSource[] = baselines.map((baseline) => ({
    actionLabel: "Use this baseline",
    boundCourseCode: null,
    description: baseline.description,
    facultyAccessible: baseline.is_faculty_accessible,
    href: buildProgramHeadNewToolFromBaselinePath(programId, baseline.id),
    id: baseline.id,
    name: baseline.name,
    questionCount: baseline.structure.reduce(
      (total, section) => total + section.questions.length,
      0
    ),
    sectionCount: baseline.structure.length,
    templateType: baseline.template_type,
  }));

  return (
    <TemplateStartChooser
      backHref={buildProgramHeadToolsPath(programId)}
      blankDescription="Build every section and question yourself, starting from one empty section."
      blankHref={buildProgramHeadNewBlankToolPath(programId)}
      emptySourcesDescription="The Dean's office has not published an institutional baseline yet. You can start blank and build the template you need."
      emptySourcesTitle="No institutional baselines available"
      eyebrow={`${program.code} — ${program.name}`}
      heading="New Evaluation Template"
      intro="Choose a starting point. Everything stays editable, so you can adjust it as you go."
      sources={sources}
      sourcesDescription={`College-standard templates maintained by the Dean's office. Using one gives your program its own copy; the baseline itself is never changed.`}
      sourcesHeading="Start from an institutional baseline"
    />
  );
}
