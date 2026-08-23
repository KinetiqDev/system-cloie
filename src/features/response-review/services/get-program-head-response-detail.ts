import { StudentSection, TargetStakeholder, YearLevel } from "@prisma/client";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { prisma } from "@/lib/db/prisma";
import { resolveItemScaleIdentity, type ScaleIdentity } from "@/features/analytics/aggregators/scale-identity";
import type { CiloPloMapping } from "@/features/analytics/aggregators/types";
import { ROLES } from "@/lib/constants/roles";
import { getSnapshotSectionItems, isSnapshotSection } from "@/features/analytics/services/snapshot-structure";
import { loadCiloMappings } from "./cilo-mappings";
import {
  loadRespondentIdentityContexts,
  type RespondentIdentityContext,
} from "./respondent-context";
import { buildPeriodLabel } from "./period-label";
import type {
  CourseBoundResponseContext,
  ProgramHeadSubmittedResponseDetail,
  ProgramWideResponseContext,
  SubmittedAnswerBinding,
} from "../types";

// ---------------------------------------------------------------------------
// Program Head identified individual response detail (spec §27, §40)
//
// Authorization (§29): PROGRAM_HEAD role → selected Program context →
// response must belong to the selected Program → SUBMITTED gate before any
// answer body is returned. Faculty/Dean keep the anonymized flow.
// ---------------------------------------------------------------------------

type CourseBoundCiloBinding = {
  id: string;
  cilo_id: string | null;
  cilo_description_snapshot: string;
  section_key: string;
  item_key: string;
};

type CourseBoundEvalShape = {
  id: string;
  deployment_name: string;
  instrument: { structure_snapshot: unknown };
  course_assignment: {
    course: { code: string; title: string; major: { name: string } | null };
    faculty: { name: string } | null;
    program: { name: string };
    year_level: YearLevel;
    section: StudentSection;
    term_instance: {
      id: string;
      school_year: { code: string };
      semester: string;
      term: string | null;
    };
  };
  cilo_question_bindings: CourseBoundCiloBinding[];
};

type PloSnapshotShape = {
  plo_id: string | null;
  plo_code_snapshot: string;
  plo_description_snapshot: string;
  section_key: string;
  item_key: string;
};

type CentralEvalShape = {
  id: string;
  deployment_name: string;
  target_stakeholder: TargetStakeholder;
  year_level: YearLevel | null;
  instrument: { version_number: number; structure_snapshot: unknown };
  program: { name: string } | null;
  major: { name: string } | null;
  term_instance: { id: string; school_year: { code: string }; semester: string; term: string | null };
  plo_snapshots: PloSnapshotShape[];
};

type EvaluationProjection =
  | {
      type: "COURSE_BOUND";
      id: string;
      title: string;
      context: CourseBoundResponseContext;
      snapshot: unknown;
      bindings: CourseBoundCiloBinding[];
      stakeholder: TargetStakeholder;
      termInstanceId: string;
      ploSnapshots: PloSnapshotShape[];
    }
  | {
      type: "PROGRAM_WIDE";
      id: string;
      title: string;
      context: ProgramWideResponseContext;
      snapshot: unknown;
      bindings: CourseBoundCiloBinding[];
      stakeholder: TargetStakeholder;
      termInstanceId: string;
      ploSnapshots: PloSnapshotShape[];
    };

export async function getProgramHeadResponseDetail(
  programId: string,
  responseId: string
): Promise<ProgramHeadSubmittedResponseDetail | null> {
  const authSession = await resolveAuthSession();

  if (!authSession || authSession.activeRole !== ROLES.PROGRAM_HEAD) {
    return null;
  }

  const context = await resolveProgramHeadContext(programId);
  if (!context.success) {
    return null;
  }

  const response = await prisma.response.findFirst({
    where: {
      id: responseId,
      status: "SUBMITTED",
      assignment: {
        OR: [
          { course_bound: { course_assignment: { program_id: programId } } },
          { central_deployment: { program_id: programId } },
        ],
      },
    },
    include: {
      respondent: { select: { id: true, name: true } },
      assignment: {
        include: {
          course_bound: {
            include: {
              instrument: { select: { structure_snapshot: true } },
              course_assignment: {
                include: {
                  course: { include: { major: true } },
                  faculty: { select: { name: true } },
                  program: { select: { name: true } },
                  term_instance: { include: { school_year: true } },
                },
              },
              cilo_question_bindings: true,
            },
          },
          central_deployment: {
            include: {
              instrument: { select: { version_number: true, structure_snapshot: true } },
              program: { select: { name: true } },
              major: { select: { name: true } },
              term_instance: { include: { school_year: true } },
              plo_snapshots: true,
            },
          },
        },
      },
      quant_items: true,
      qual_items: true,
    },
  });

  if (
    !response ||
    !response.submitted_at ||
    (!response.assignment.course_bound && !response.assignment.central_deployment)
  ) {
    return null;
  }

  const evaluation: EvaluationProjection = response.assignment.course_bound
    ? {
        type: "COURSE_BOUND",
        id: response.assignment.course_bound.id,
        title: response.assignment.course_bound.deployment_name,
        context: buildCourseBoundContext(response.assignment.course_bound),
        snapshot: response.assignment.course_bound.instrument.structure_snapshot,
        bindings: response.assignment.course_bound.cilo_question_bindings,
        stakeholder: TargetStakeholder.STUDENT,
        termInstanceId: response.assignment.course_bound.course_assignment.term_instance.id,
        ploSnapshots: [],
      }
    : {
        type: "PROGRAM_WIDE",
        id: response.assignment.central_deployment!.id,
        title: response.assignment.central_deployment!.deployment_name,
        context: buildProgramWideContext(response.assignment.central_deployment!),
        snapshot: response.assignment.central_deployment!.instrument.structure_snapshot,
        bindings: [],
        stakeholder: response.assignment.central_deployment!.target_stakeholder,
        termInstanceId: response.assignment.central_deployment!.term_instance.id,
        ploSnapshots: response.assignment.central_deployment!.plo_snapshots,
      };

  const [identityContexts, ciloMappings] = await Promise.all([
    loadRespondentIdentityContexts(
      [response.respondent.id],
      evaluation.stakeholder,
      evaluation.termInstanceId
    ),
    evaluation.type === "COURSE_BOUND"
      ? loadCiloMappings(boundCiloIds(evaluation.bindings))
      : Promise.resolve(new Map<string, CiloPloMapping[]>()),
  ]);

  const sections = (
    Array.isArray(evaluation.snapshot) ? evaluation.snapshot : []
  )
    .filter(isSnapshotSection)
    .map((section) => {
      const items = getSnapshotSectionItems(section);
      const entries = items.map((item) => {
        if (item.kind === "quantitative") {
          const entry = response.quant_items.find(
            (candidate) =>
              candidate.section_key === section.key && candidate.item_key === item.key
          );
          if (!entry) {
            return null;
          }
          const scale = resolveItemScaleIdentity(evaluation.snapshot, section.key, item.key);
          return {
            kind: "quantitative" as const,
            itemKey: item.key,
            prompt: item.prompt,
            rating: entry.rating_value,
            scaleLabel: scaleLabelFor(scale, entry.rating_value),
            binding: resolveCourseBoundBinding(evaluation, entry, ciloMappings),
          };
        }
        const entry = response.qual_items.find(
          (candidate) =>
            candidate.section_key === section.key && candidate.prompt_key === item.key
        );
        if (!entry || entry.text_content.trim().length === 0) {
          return null;
        }
        return {
          kind: "qualitative" as const,
          promptKey: item.key,
          prompt: item.prompt,
          text: entry.text_content,
        };
      });

      return {
        key: section.key,
        title: section.title,
        items: entries.filter(
          (entry): entry is NonNullable<typeof entry> => entry !== null
        ),
      };
    })
    .filter((section) => section.items.length > 0);

  const validRatings: number[] = [];
  for (const section of sections) {
    for (const item of section.items) {
      if (item.kind !== "quantitative") {
        continue;
      }
      const scale = resolveItemScaleIdentity(evaluation.snapshot, section.key, item.itemKey);
      if (scale && scale.descriptors.some((descriptor) => descriptor.value === item.rating)) {
        validRatings.push(item.rating);
      }
    }
  }
  const quantitativeMean =
    validRatings.length === 0 ? null : validRatings.reduce((sum, value) => sum + value, 0) / validRatings.length;

  return {
    responseId: response.id,
    submittedAt: response.submitted_at,
    respondent: {
      id: response.respondent.id,
      name: response.respondent.name,
      stakeholder: evaluation.stakeholder,
      ...identityFragment(identityContexts.get(response.respondent.id), evaluation.stakeholder),
    },
    evaluation:
      evaluation.type === "COURSE_BOUND"
        ? {
            id: evaluation.id,
            type: "COURSE_BOUND",
            title: evaluation.title,
            context: evaluation.context,
          }
        : {
            id: evaluation.id,
            type: "PROGRAM_WIDE",
            title: evaluation.title,
            context: evaluation.context,
          },
    quantitativeMean,
    sections,
  };
}

function buildCourseBoundContext(evaluation: CourseBoundEvalShape): CourseBoundResponseContext {
  const ca = evaluation.course_assignment;
  return {
    courseCode: ca.course.code,
    courseTitle: ca.course.title,
    facultyName: ca.faculty?.name ?? null,
    yearLevel: ca.year_level,
    section: ca.section,
    majorLabel: ca.course.major?.name ?? null,
    periodLabel: buildPeriodLabel(ca.term_instance),
  };
}

function buildProgramWideContext(deployment: CentralEvalShape): ProgramWideResponseContext {
  return {
    stakeholder: deployment.target_stakeholder,
    targetProgramLabel: deployment.program?.name ?? null,
    targetMajorLabel: deployment.major?.name ?? null,
    targetYearLevel: deployment.year_level,
    instrumentVersion: deployment.instrument.version_number,
    periodLabel: buildPeriodLabel(deployment.term_instance),
  };
}

function boundCiloIds(bindings: CourseBoundCiloBinding[]): string[] {
  return bindings
    .map((binding) => binding.cilo_id)
    .filter((ciloId): ciloId is string => ciloId !== null);
}

function resolveCourseBoundBinding(
  evaluation: EvaluationProjection,
  entry: { cilo_question_binding_id: string | null; section_key: string; item_key: string },
  ciloMappings: Map<string, CiloPloMapping[]>
): SubmittedAnswerBinding {
  if (evaluation.type === "PROGRAM_WIDE") {
    const bindings = evaluation.ploSnapshots
      .filter(
        (snapshot) =>
          snapshot.section_key === entry.section_key && snapshot.item_key === entry.item_key
      )
      .map((snapshot) => ({
        key: snapshot.plo_id ?? snapshot.plo_code_snapshot,
        code: snapshot.plo_code_snapshot,
        description: snapshot.plo_description_snapshot,
      }));
    return bindings.length > 0
      ? { type: "PLO", ploBindings: bindings }
      : { type: "GENERAL" };
  }

  const binding = evaluation.bindings.find(
    (candidate) =>
      candidate.id === entry.cilo_question_binding_id ||
      (!entry.cilo_question_binding_id &&
        candidate.section_key === entry.section_key &&
        candidate.item_key === entry.item_key)
  );
  if (!binding) {
    return { type: "GENERAL" };
  }
  return {
    type: "CILO",
    ciloId: binding.cilo_id,
    ciloLabel: binding.cilo_description_snapshot,
    ploMappings: ciloMappings.get(binding.cilo_id ?? "") ?? [],
  };
}

function scaleLabelFor(scale: ScaleIdentity | null, rating: number): string | null {
  const descriptor = scale?.descriptors.find((candidate) => candidate.value === rating);
  return descriptor?.label ?? null;
}

function identityFragment(
  context: RespondentIdentityContext | undefined,
  stakeholder: TargetStakeholder
): Pick<
  ProgramHeadSubmittedResponseDetail["respondent"],
  "studentContext" | "alumniContext" | "industryContext"
> {
  if (!context) {
    return {};
  }
  if (context.kind === "STUDENT" && stakeholder === TargetStakeholder.STUDENT) {
    return {
      studentContext: {
        programId: context.programId,
        programLabel: context.programLabel,
        majorId: context.majorId,
        majorLabel: context.majorLabel,
        yearLevel: context.yearLevel,
        section: context.section,
      },
    };
  }
  if (context.kind === "ALUMNI" && stakeholder === TargetStakeholder.ALUMNI) {
    return {
      alumniContext: {
        programLabel: context.programLabel,
        majorLabel: context.majorLabel,
        graduationYear: context.graduationYear,
      },
    };
  }
  if (context.kind === "INDUSTRY_PARTNER" && stakeholder === TargetStakeholder.INDUSTRY_PARTNER) {
    return {
      industryContext: {
        companyName: context.companyName,
        position: context.position,
      },
    };
  }
  return {};
}
