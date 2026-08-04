import { getYearLevelDisplay } from "@/lib/constants/year-levels";
import { prisma } from "@/lib/db/prisma";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import type { DeploymentStatus, TargetStakeholder } from "@prisma/client";

import { type ServiceResult } from "@/lib/utils/service-result";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";

export type ProgramHeadDeploymentItem = {
  id: string;
  templateName: string;
  templateId: string;
  programName: string | null;
  programCode: string | null;
  majorName: string | null;
  yearLevelName: string | null;
  target_stakeholder: TargetStakeholder;
  status: DeploymentStatus;
  termInstanceLabel: string | null;
  activation_at: Date | null;
  deadline_at: Date | null;
  created_at: Date;
  assignmentCount: number;
  responseCount: number;
};

export type ListProgramHeadDeploymentsResult = {
  deployments: ProgramHeadDeploymentItem[];
  program: { id: string; code: string; name: string };
};

// ─── Main Service ────────────────────────────────────────────────────────────

export async function listProgramHeadDeployments(programId: string): Promise<
  ServiceResult<ListProgramHeadDeploymentsResult>
> {
  const contextResult = await resolveProgramHeadContext(programId);
  if (!contextResult.success) return contextResult;
  const selectedProgram = contextResult.data.selectedProgram;

  // 3. Resolve program info
  const program = await prisma.program.findUnique({
    where: { id: selectedProgram.id },
    select: { id: true, code: true, name: true },
  });

  if (!program) {
    return { success: false, error: "Assigned program not found." };
  }

  // 4. Query CentralDeployment only for the selected Program.
  const rawDeployments = await prisma.centralDeployment.findMany({
    where: {
        program_id: selectedProgram.id,
    },
    include: {
      instrument: {
        include: {
          template: {
            select: { id: true, name: true },
          },
        },
      },
      program: {
        select: { code: true, name: true },
      },
      major: {
        select: { name: true },
      },
      // Phase 7: Include term instance for label
      term_instance: {
        include: {
          school_year: true,
        },
      },
      assignments: {
        select: {
          id: true,
          response: {
            select: {
              status: true,
            },
          },
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  // 5. Map to typed result with counts
  const deployments: ProgramHeadDeploymentItem[] = rawDeployments.map((d) => {
    // Phase 7: Build term instance label if available
    const termInstanceLabel = d.term_instance
      ? formatTermInstanceLabel(
          d.term_instance.school_year.code,
          d.term_instance.semester,
          d.term_instance.term
        )
      : null;

    return {
      id: d.id,
      templateName: d.deployment_name ?? d.instrument.template.name,
      templateId: d.instrument.template.id,
      programName: d.program?.name ?? null,
      programCode: d.program?.code ?? null,
      majorName: d.major?.name ?? null,
      yearLevelName: d.year_level ? getYearLevelDisplay(d.year_level) : null,
      target_stakeholder: d.target_stakeholder,
      status: d.status,
      termInstanceLabel,
      activation_at: d.activation_at,
      deadline_at: d.deadline_at,
      created_at: d.created_at,
      assignmentCount: d.assignments.length,
      responseCount: d.assignments.filter((a) => a.response?.status === "SUBMITTED").length,
    };
  });

  return { success: true, data: { deployments, program } };
}
