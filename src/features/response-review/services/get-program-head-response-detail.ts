import { StudentSection, TargetStakeholder, YearLevel } from "@prisma/client";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { prisma } from "@/lib/db/prisma";
import type { CiloGoMapping } from "@/features/analytics/aggregators/types";
import { ROLES } from "@/lib/constants/roles";
import { loadCiloMappings } from "./cilo-mappings";
import { loadRespondentIdentityContexts } from "./respondent-context";
import { buildPeriodLabel } from "./period-label";
import {
  buildSubmittedResponseSections,
  respondentIdentityFragment,
  submittedResponseMean,
  type CourseBoundCiloBinding,
  type PoQuestionBindingSnapshot,
} from "./submitted-response-projection";
import type {
  CourseBoundResponseContext,
  IdentifiedSubmittedResponseDetail,
  ProgramWideResponseContext,
} from "../types";

// ---------------------------------------------------------------------------
// Program Head identified individual response detail (spec §27, §40)
//
// Authorization (§29): PROGRAM_HEAD role → selected Program context →
// response must belong to the selected Program → SUBMITTED gate before any
// answer body is returned. Faculty/Dean keep the anonymized flow.
// ---------------------------------------------------------------------------

type CourseBoundPoBinding = PoQuestionBindingSnapshot;

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
  po_question_bindings: CourseBoundPoBinding[];
};

type PoSnapshotShape = PoQuestionBindingSnapshot;

type CentralEvalShape = {
  id: string;
  deployment_name: string;
  target_stakeholder: TargetStakeholder;
  year_level: YearLevel | null;
  instrument: { version_number: number; structure_snapshot: unknown };
  program: { name: string } | null;
  major: { name: string } | null;
  term_instance: {
    id: string;
    school_year: { code: string };
    semester: string;
    term: string | null;
  };
  po_snapshots: PoSnapshotShape[];
};

type EvaluationProjectionBase = {
  id: string;
  title: string;
  snapshot: unknown;
  bindings: CourseBoundCiloBinding[];
  stakeholder: TargetStakeholder;
  termInstanceId: string;
  poSnapshots: PoSnapshotShape[];
};

type EvaluationProjection = EvaluationProjectionBase &
  (
    | { type: "COURSE_BOUND"; context: CourseBoundResponseContext }
    | { type: "PROGRAM_WIDE"; context: ProgramWideResponseContext }
  );

export async function getProgramHeadResponseDetail(
  programId: string,
  responseId: string
): Promise<IdentifiedSubmittedResponseDetail | null> {
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
          {
            course_bound: {
              course_assignment: {
                program_id: programId,
                course: { course_scope: "PROGRAM_SPECIFIC" },
              },
            },
          },
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
              po_question_bindings: true,
            },
          },
          central_deployment: {
            include: {
              instrument: { select: { version_number: true, structure_snapshot: true } },
              program: { select: { name: true } },
              major: { select: { name: true } },
              term_instance: { include: { school_year: true } },
              po_snapshots: true,
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

  const evaluation = projectEvaluation(response);

  const [identityContexts, poMappings] = await Promise.all([
    loadRespondentIdentityContexts(
      [response.respondent.id],
      evaluation.stakeholder,
      evaluation.termInstanceId
    ),
    evaluation.type === "COURSE_BOUND"
      ? loadCiloMappings(boundCiloIds(evaluation.bindings))
      : Promise.resolve(new Map<string, CiloGoMapping[]>()),
  ]);

  // Program-specific and Central evidence reach Program Outcomes only, so
  // the ILO map stays empty and the projection runs on the PO layer.
  const sections = buildSubmittedResponseSections(
    response,
    {
      snapshot: evaluation.snapshot,
      ciloBindings: evaluation.bindings,
      poSnapshots: evaluation.poSnapshots,
      layer: "GRADUATE_OUTCOME",
    },
    { poMappings, iloMappings: new Map() }
  );
  const quantitativeMean = submittedResponseMean(sections, evaluation.snapshot);

  return {
    responseId: response.id,
    submittedAt: response.submitted_at,
    respondent: {
      id: response.respondent.id,
      name: response.respondent.name,
      stakeholder: evaluation.stakeholder,
      ...respondentIdentityFragment(
        identityContexts.get(response.respondent.id),
        evaluation.stakeholder
      ),
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
    termInstanceId: ca.term_instance.id,
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
    termInstanceId: deployment.term_instance.id,
  };
}

function boundCiloIds(bindings: CourseBoundCiloBinding[]): string[] {
  return bindings
    .map((binding) => binding.cilo_id)
    .filter((ciloId): ciloId is string => ciloId !== null);
}

function projectEvaluation(response: {
  assignment: {
    course_bound: CourseBoundEvalShape | null;
    central_deployment: CentralEvalShape | null;
  };
}): EvaluationProjection {
  if (response.assignment.course_bound) {
    const courseBound = response.assignment.course_bound;
    return {
      type: "COURSE_BOUND",
      id: courseBound.id,
      title: courseBound.deployment_name,
      context: buildCourseBoundContext(courseBound),
      snapshot: courseBound.instrument.structure_snapshot,
      bindings: courseBound.cilo_question_bindings,
      stakeholder: TargetStakeholder.STUDENT,
      termInstanceId: courseBound.course_assignment.term_instance.id,
      poSnapshots: courseBound.po_question_bindings,
    };
  }
  const deployment = response.assignment.central_deployment!;
  return {
    type: "PROGRAM_WIDE",
    id: deployment.id,
    title: deployment.deployment_name,
    context: buildProgramWideContext(deployment),
    snapshot: deployment.instrument.structure_snapshot,
    bindings: [],
    stakeholder: deployment.target_stakeholder,
    termInstanceId: deployment.term_instance.id,
    poSnapshots: deployment.po_snapshots,
  };
}
