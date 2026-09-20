import { EvaluationTemplateType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { planCentralGoBindings } from "./central-deployment-go-plan";
import { type ServiceResult } from "@/lib/utils/service-result";
import type { CentralPublishReadiness } from "../types";

/**
 * Server-prepared GO binding readiness for the Program Head publish step:
 * which Likert questions the selected template leaves unbound, which GOs it
 * covers, and any binding problem that still blocks publication. Unbound
 * questions do not block publication; they publish as general evaluation
 * items and produce no GO evidence.
 */
export async function resolveCentralPublishReadiness(
  programId: string
): Promise<ServiceResult<Record<string, CentralPublishReadiness>>> {
  const contextResult = await resolveProgramHeadContext(programId);
  if (!contextResult.success) return contextResult;
  const { selectedProgram } = contextResult.data;

  // Same template predicate as publishCentralDeployment: an active
  // PROGRAM_WIDE template owned by the program or an institutional baseline.
  const templates = await prisma.instrumentTemplate.findMany({
    where: {
      is_active: true,
      template_type: EvaluationTemplateType.PROGRAM_WIDE,
      OR: [{ program_id: selectedProgram.id }, { program_id: null }],
    },
    select: { id: true, structure: true, template_go_question_bindings: true },
  });

  const boundGoIds = [
    ...new Set(
      templates.flatMap((template) =>
        template.template_go_question_bindings.map((binding) => binding.go_id)
      )
    ),
  ].filter((goId): goId is string => Boolean(goId));

  const liveGos =
    boundGoIds.length > 0
      ? await prisma.gO.findMany({
          where: {
            program_id: selectedProgram.id,
            id: { in: boundGoIds },
            is_active: true,
          },
          select: { id: true, code: true, description: true },
        })
      : [];

  const readiness: Record<string, CentralPublishReadiness> = {};
  for (const template of templates) {
    const plan = planCentralGoBindings({
      bindings: template.template_go_question_bindings,
      structure: template.structure,
      liveGos,
    });
    readiness[template.id] = {
      templateId: template.id,
      likertCount: plan.likertCount,
      boundQuestionCount: plan.likertCount - plan.unboundQuestions.length,
      coveredGos: plan.coveredGos.map(({ code, description }) => ({ code, description })),
      unboundQuestions: plan.unboundQuestions,
      blockingError: plan.error,
    };
  }

  return { success: true, data: readiness };
}
