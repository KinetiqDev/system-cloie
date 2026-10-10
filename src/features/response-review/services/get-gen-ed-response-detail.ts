import { type GEAlignmentMode, StudentSection, TargetStakeholder, YearLevel } from "@prisma/client";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { loadCiloIloMappings, loadCiloCommonMappings } from "./cilo-mappings";
import { loadRespondentIdentityContexts } from "./respondent-context";
import { buildPeriodLabel } from "./period-label";
import {
  buildSubmittedResponseSections,
  respondentIdentityFragment,
  submittedResponseMean,
  type CourseBoundCiloBinding,
} from "./submitted-response-projection";
import type { IdentifiedSubmittedResponseDetail } from "../types";

// ---------------------------------------------------------------------------
// General Education identified individual response detail (ADR 0034)
//
// Authorization: GEN_ED_COORDINATOR role → the response belongs to a General
// Education Course → SUBMITTED gate before any answer body is returned. There
// is no selected-Program context and no Program-wide branch: Central evidence
// stays with the Program Heads, so a guessed id resolves to null.
// ---------------------------------------------------------------------------
type GeneralEducationCourseBoundEvaluation = {
  id: string;
  deployment_name: string;
  instrument: { structure_snapshot: unknown };
  course_assignment: {
    course: {
      ge_alignment_mode?: GEAlignmentMode;
      code: string;
      title: string;
      major: { name: string } | null;
    };
    faculty: { name: string } | null;
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

export async function getGenEdResponseDetail(
  responseId: string
): Promise<IdentifiedSubmittedResponseDetail | null> {
  const authSession = await resolveAuthSession();

  if (!authSession || authSession.activeRole !== ROLES.GEN_ED_COORDINATOR) {
    return null;
  }

  const response = await prisma.response.findFirst({
    where: {
      id: responseId,
      status: "SUBMITTED",
      deployment_type: "COURSE_BOUND",
      assignment: {
        course_bound: {
          course_assignment: { course: { course_scope: "GENERAL_EDUCATION" } },
        },
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
        },
      },
      quant_items: true,
      qual_items: true,
    },
  });

  if (!response?.submitted_at || !response.assignment.course_bound) {
    return null;
  }

  const evaluation: GeneralEducationCourseBoundEvaluation = response.assignment.course_bound;
  const ca = evaluation.course_assignment;

  const isCommon = ca.course.ge_alignment_mode === "COMMON_PO";
  const ids = evaluation.cilo_question_bindings
    .map((binding) => binding.cilo_id)
    .filter((id): id is string => id !== null);
  const commonMappings = isCommon ? await loadCiloCommonMappings(ids) : new Map();
  const [identityContexts, iloMappings] = await Promise.all([
    loadRespondentIdentityContexts(
      [response.respondent.id],
      TargetStakeholder.STUDENT,
      ca.term_instance.id
    ),
    isCommon
      ? Promise.resolve(new Map())
      : loadCiloIloMappings(
          evaluation.cilo_question_bindings
            .map((binding) => binding.cilo_id)
            .filter((ciloId): ciloId is string => ciloId !== null)
        ),
  ]);

  // General Education answers reach Institutional Learning Outcomes only, so
  // the projection runs on the ILO layer with the PO map left empty. The
  // loaded direct PO snapshots are Program-only and never surface here.
  const sections = buildSubmittedResponseSections(
    response,
    {
      snapshot: evaluation.instrument.structure_snapshot,
      ciloBindings: evaluation.cilo_question_bindings,
      poSnapshots: [],
      layer: isCommon ? "COMMON_PROGRAM_OUTCOME" : "INSTITUTIONAL_OUTCOME",
    },
    { poMappings: new Map(), iloMappings, commonMappings }
  );

  return {
    responseId: response.id,
    submittedAt: response.submitted_at,
    respondent: {
      id: response.respondent.id,
      name: response.respondent.name,
      stakeholder: TargetStakeholder.STUDENT,
      ...respondentIdentityFragment(
        identityContexts.get(response.respondent.id),
        TargetStakeholder.STUDENT
      ),
    },
    evaluation: {
      id: evaluation.id,
      type: "COURSE_BOUND",
      title: evaluation.deployment_name,
      context: {
        courseCode: ca.course.code,
        courseTitle: ca.course.title,
        facultyName: ca.faculty?.name ?? null,
        yearLevel: ca.year_level,
        section: ca.section,
        majorLabel: ca.course.major?.name ?? null,
        periodLabel: buildPeriodLabel(ca.term_instance),
        termInstanceId: ca.term_instance.id,
      },
    },
    quantitativeMean: submittedResponseMean(sections, evaluation.instrument.structure_snapshot),
    sections,
  };
}
