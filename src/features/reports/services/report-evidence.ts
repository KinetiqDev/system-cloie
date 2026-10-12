import type {
  AcademicSemester,
  AcademicTerm,
  Prisma,
  StudentSection,
  TargetStakeholder,
  YearLevel,
} from "@prisma/client";
import { ResponseStatus } from "@prisma/client";
import { PO_CLASSIFICATION_LABELS } from "@/features/outcomes/po-classification";
import { getYearLevelDisplay } from "@/lib/constants/year-levels";
import {
  buildPeriodLabel,
  buildPeriodOptions,
  getSemesterLabel,
} from "@/features/analytics/services/academic-periods";
import { resolveTermInstanceFilter } from "@/features/analytics/services/get-program-head-analytics";
import {
  parseCourseInfoSnapshot,
  resolveSnapshotNullableText,
  resolveSnapshotText,
} from "@/features/evaluations/services/course-info-snapshot";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { prisma } from "@/lib/db/prisma";
import type { AnalyticsFilterState } from "@/features/analytics/services/program-head-analytics-state";
import {
  REPORT_NAME_UNAVAILABLE,
  type ReportCentralGroup,
  type ReportCiloMapping,
  type ReportCourseGroup,
  type ReportEvidence,
  type ReportPeriodContext,
  type ReportProgramOutcome,
  type ReportResponseRow,
  type ReportTermInstance,
} from "../types";

/**
 * Program Head report-export evidence read.
 *
 * Scope matches Analytics exactly: Professional Course-bound evidence and
 * Central deployments of the selected Program inside the resolved academic
 * period, submitted responses only. The optional year level narrows course-bound
 * evidence through the Program's own `CourseBoundEvaluationTarget` rows, which
 * is the same defensible attribution rule Analytics uses. This module reads and
 * shapes evidence; every count, mean, and interpretation comes from the
 * canonical Analytics aggregators in the report builders.
 */

/** Filters one export may narrow. Year level is course-evidence scoped. */
export type ReportExportFilters = Pick<
  AnalyticsFilterState,
  "schoolYearId" | "semester" | "termInstanceId" | "yearLevel"
>;

const TERM_INSTANCE_SELECT = {
  id: true,
  semester: true,
  term: true,
  school_year: { select: { id: true, code: true } },
} as const;

const INSTRUMENT_SELECT = {
  id: true,
  version_number: true,
  structure_snapshot: true,
  template: { select: { name: true } },
} as const;

const COURSE_GROUP_SELECT = {
  id: true,
  deployment_name: true,
  status: true,
  course_info_snapshot: true,
  cilos_snapshot: true,
  term_instance: { select: TERM_INSTANCE_SELECT },
  instrument: { select: INSTRUMENT_SELECT },
  course_assignment: {
    select: {
      id: true,
      year_level: true,
      section: true,
      course: { select: { id: true, code: true, title: true } },
      faculty: { select: { id: true, name: true } },
    },
  },
  cilo_question_bindings: {
    select: {
      section_key: true,
      item_key: true,
      cilo_id: true,
      cilo_description_snapshot: true,
      question_prompt_snapshot: true,
    },
    orderBy: { created_at: "asc" },
  },
  po_question_bindings: {
    select: {
      section_key: true,
      item_key: true,
      po_id: true,
      po_code_snapshot: true,
      po_description_snapshot: true,
      question_prompt_snapshot: true,
    },
    orderBy: { created_at: "asc" },
  },
  assignments: {
    select: { respondent_id: true, response: { select: { status: true } } },
  },
} as const;

const CENTRAL_GROUP_SELECT = {
  id: true,
  deployment_name: true,
  status: true,
  target_stakeholder: true,
  year_level: true,
  term_instance: { select: TERM_INSTANCE_SELECT },
  instrument: { select: INSTRUMENT_SELECT },
  major: { select: { name: true } },
  po_snapshots: {
    select: {
      section_key: true,
      item_key: true,
      po_id: true,
      po_code_snapshot: true,
      po_description_snapshot: true,
      question_prompt_snapshot: true,
    },
  },
  assignments: {
    select: { respondent_id: true, response: { select: { status: true } } },
  },
} as const;

type CourseGroupRow = Prisma.CourseBoundEvaluationGetPayload<{
  select: typeof COURSE_GROUP_SELECT;
}>;
type CentralGroupRow = Prisma.CentralDeploymentGetPayload<{ select: typeof CENTRAL_GROUP_SELECT }>;
type SubmittedResponseRow = Prisma.ResponseGetPayload<{
  select: {
    id: true;
    deployment_id: true;
    submitted_at: true;
    respondent_id: true;
    respondent: { select: { name: true } };
    quant_items: {
      select: { section_key: true; item_key: true; rating_value: true };
      orderBy: { created_at: "asc" };
    };
  };
}>;

/** One term instance resolved into the period columns and labels an export prints. */
function toReportTermInstance(
  instance: Prisma.AcademicTermInstanceGetPayload<{ select: typeof TERM_INSTANCE_SELECT }>
): ReportTermInstance {
  const option = buildPeriodOptions([instance]).termInstances[0];
  return {
    termInstanceId: instance.id,
    schoolYearCode: instance.school_year.code,
    semester: instance.semester as AcademicSemester,
    semesterLabel: option.semesterLabel,
    term: instance.term as AcademicTerm | null,
    termLabel: option.termLabel,
    label: option.label,
  };
}

function instrumentLabel(instrument: {
  version_number: number;
  template: { name: string };
}): string {
  return `${instrument.template.name} v${instrument.version_number}`;
}

/**
 * Respondent account name, or the explicit unavailable marker. A blank account
 * name never falls back to another respondent's identity.
 */
function toRespondentName(name: string): string {
  return name.trim().length > 0 ? name.trim() : REPORT_NAME_UNAVAILABLE;
}

/**
 * Resolve the academic period context and the term-instance predicate for an
 * export. Reuses the Analytics period resolution, so an export period and an
 * Analytics period select the same evidence.
 */
export async function resolveReportPeriod(
  programId: string,
  filters: ReportExportFilters
): Promise<{ context: ReportPeriodContext; termInstanceWhere: Record<string, unknown> }> {
  const resolved = await resolveTermInstanceFilter(programId, filters);
  const singleInstance =
    filters.termInstanceId && resolved.instances.length === 1 ? resolved.instances[0] : null;
  const instanceOption = singleInstance
    ? buildPeriodOptions([singleInstance]).termInstances[0]
    : null;
  const composedLabel = buildPeriodLabel(filters, resolved.schoolYearLabel, resolved.instances);

  return {
    context: {
      schoolYearId: filters.schoolYearId ?? null,
      schoolYearCode: instanceOption?.schoolYearLabel ?? resolved.schoolYearLabel ?? null,
      semester: (filters.semester as AcademicSemester | undefined) ?? null,
      // A semester selected without a term still narrows the scope, so the
      // label must name it rather than claim "All semesters".
      semesterLabel: instanceOption?.semesterLabel ?? getSemesterLabel(filters.semester),
      termInstanceId: filters.termInstanceId ?? null,
      termLabel: instanceOption?.termLabel ?? null,
      label: instanceOption?.label ?? composedLabel ?? "All academic periods",
    },
    termInstanceWhere: resolved.where,
  };
}

/** Year levels the selected Program's Professional Courses are taught in. */
export async function listProgramHeadReportYearLevels(
  programId: string
): Promise<Array<{ value: YearLevel; label: string }>> {
  const context = await resolveProgramHeadContext(programId);
  if (!context.success) return [];

  const assignments = await prisma.courseAssignment.findMany({
    where: { program_id: programId, course: { course_scope: "PROFESSIONAL" } },
    select: { year_level: true },
    distinct: ["year_level"],
  });

  return [
    ...new Set(
      assignments.map((row) => row.year_level).filter((value): value is YearLevel => value !== null)
    ),
  ]
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({ value, label: getYearLevelDisplay(value) }));
}

/**
 * Current CILO-to-PO mappings of the selected Program. Rows without a
 * manifestation are kept: the canonical PO evidence path counts them, so
 * dropping them here would make an export disagree with Analytics.
 */
async function readCiloMappings(
  programId: string,
  ciloIds: string[]
): Promise<Map<string, ReportCiloMapping[]>> {
  const byCilo = new Map<string, ReportCiloMapping[]>();
  if (ciloIds.length === 0) return byCilo;

  const rows = await prisma.cILOMapping.findMany({
    where: { cilo_id: { in: ciloIds }, po: { program_id: programId } },
    select: {
      cilo_id: true,
      manifestation: true,
      po: { select: { id: true, code: true, description: true, classification: true } },
    },
    orderBy: { po: { code: "asc" } },
  });

  for (const row of rows) {
    const mapping: ReportCiloMapping = {
      poId: row.po.id,
      poCode: row.po.code,
      poDescription: row.po.description,
      manifestation: row.manifestation,
      classification: row.po.classification,
      classificationLabel: PO_CLASSIFICATION_LABELS[row.po.classification],
    };
    const bucket = byCilo.get(row.cilo_id) ?? [];
    bucket.push(mapping);
    byCilo.set(row.cilo_id, bucket);
  }
  return byCilo;
}

/**
 * Authorized evidence read for one Program Head report export. Returns null when
 * the actor is not a Program Head authorized for this Program.
 */
export async function readProgramHeadReportEvidence(
  programId: string,
  filters: ReportExportFilters
): Promise<ReportEvidence | null> {
  const contextResult = await resolveProgramHeadContext(programId);
  if (!contextResult.success) return null;
  const selectedProgram = contextResult.data.selectedProgram;

  const yearLevel = (filters.yearLevel as YearLevel | undefined) ?? null;
  const { context: period, termInstanceWhere } = await resolveReportPeriod(programId, filters);

  const courseRows = await prisma.courseBoundEvaluation.findMany({
    where: {
      course_assignment: {
        program_id: programId,
        course: { course_scope: "PROFESSIONAL" },
        ...termInstanceWhere,
      },
      ...(yearLevel ? { targets: { some: { program_id: programId, year_level: yearLevel } } } : {}),
    },
    select: COURSE_GROUP_SELECT,
  });
  const centralRows = await prisma.centralDeployment.findMany({
    where: { program_id: programId, ...termInstanceWhere },
    select: CENTRAL_GROUP_SELECT,
  });

  const ciloIds = [
    ...new Set(
      courseRows.flatMap((row) =>
        row.cilo_question_bindings
          .map((binding) => binding.cilo_id)
          .filter((value): value is string => value !== null)
      )
    ),
  ];
  const [courseResponses, centralResponses, outcomes, mappings] = await Promise.all([
    submittedResponsesFor(courseRows.map((row) => row.id)),
    submittedResponsesFor(centralRows.map((row) => row.id)),
    prisma.pO.findMany({
      where: { program_id: programId },
      select: {
        id: true,
        code: true,
        description: true,
        classification: true,
        is_active: true,
        order: true,
      },
      orderBy: [{ order: "asc" }, { code: "asc" }],
    }),
    readCiloMappings(programId, ciloIds),
  ]);

  return {
    programId: selectedProgram.id,
    programCode: selectedProgram.code,
    programName: selectedProgram.name,
    period,
    yearLevel,
    yearLevelLabel: yearLevel ? getYearLevelDisplay(yearLevel) : "All year levels",
    outcomes: outcomes.map(toProgramOutcome),
    ciloMappings: mappings,
    courseGroups: courseRows
      .map((row) => toCourseGroup(row, courseResponses.get(row.id) ?? []))
      .sort(compareCourseGroups),
    centralGroups: centralRows
      .map((row) => toCentralGroup(row, centralResponses.get(row.id) ?? []))
      .sort(
        (left, right) =>
          left.targetStakeholder.localeCompare(right.targetStakeholder) ||
          left.deploymentName.localeCompare(right.deploymentName) ||
          left.deploymentId.localeCompare(right.deploymentId)
      ),
  };
}

function toProgramOutcome(row: {
  id: string;
  code: string;
  description: string;
  classification: ReportProgramOutcome["classification"];
  is_active: boolean;
  order: number;
}): ReportProgramOutcome {
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    classification: row.classification,
    classificationLabel: PO_CLASSIFICATION_LABELS[row.classification],
    isActive: row.is_active,
    order: row.order,
  };
}

/** Submitted responses, keyed by deployment, with original answers and names. */
async function submittedResponsesFor(
  deploymentIds: string[]
): Promise<Map<string, ReportResponseRow[]>> {
  const byDeployment = new Map<string, ReportResponseRow[]>();
  if (deploymentIds.length === 0) return byDeployment;

  const rows: SubmittedResponseRow[] = await prisma.response.findMany({
    where: { status: ResponseStatus.SUBMITTED, deployment_id: { in: deploymentIds } },
    select: {
      id: true,
      deployment_id: true,
      submitted_at: true,
      respondent_id: true,
      respondent: { select: { name: true } },
      quant_items: {
        select: { section_key: true, item_key: true, rating_value: true },
        orderBy: { created_at: "asc" },
      },
    },
    orderBy: [{ submitted_at: "asc" }, { id: "asc" }],
  });

  for (const row of rows) {
    const bucket = byDeployment.get(row.deployment_id) ?? [];
    bucket.push({
      responseId: row.id,
      respondentId: row.respondent_id,
      respondentName: toRespondentName(row.respondent.name),
      submittedAt: row.submitted_at,
      answers: row.quant_items.map((item) => ({
        sectionKey: item.section_key,
        itemKey: item.item_key,
        ratingValue: item.rating_value,
      })),
    });
    byDeployment.set(row.deployment_id, bucket);
  }
  return byDeployment;
}

function compareCourseGroups(left: ReportCourseGroup, right: ReportCourseGroup): number {
  return (
    left.courseCode.localeCompare(right.courseCode) ||
    left.facultyName.localeCompare(right.facultyName) ||
    (left.section ?? "").localeCompare(right.section ?? "") ||
    left.evaluationName.localeCompare(right.evaluationName) ||
    left.evaluationId.localeCompare(right.evaluationId)
  );
}

/**
 * Faculty attribution for one class group.
 *
 * The publication snapshot wins whenever it recorded a name, and a snapshot
 * that explicitly recorded no faculty keeps that fact ("no faculty at
 * publication") instead of being back-filled with whoever teaches the course
 * now. A legacy snapshot written before the field existed carries no claim at
 * all, so the current course assignment supplies the label — the same fallback
 * the required snapshot fields already use.
 */
function resolvePublishedFacultyName(
  rawSnapshot: unknown,
  parsedSnapshot: ReturnType<typeof parseCourseInfoSnapshot>,
  liveName: string | null
): string {
  const snapshotName = resolveSnapshotNullableText(parsedSnapshot, "facultyName", null);
  if (snapshotName && snapshotName.trim().length > 0) return snapshotName.trim();

  const recordedField =
    rawSnapshot && typeof rawSnapshot === "object" && !Array.isArray(rawSnapshot)
      ? (rawSnapshot as Record<string, unknown>).facultyName
      : undefined;
  if (recordedField === null) return "No faculty recorded at publication";

  const live = liveName?.trim() ?? "";
  return live.length > 0 ? live : "Unassigned";
}

function toCourseGroup(row: CourseGroupRow, responses: ReportResponseRow[]): ReportCourseGroup {
  const assignment = row.course_assignment;
  // Publication-time context wins over the live assignment, so a published
  // evaluation keeps reporting the faculty member, section, and year level it
  // was published for — the same rule Response Review prints.
  const courseInfo = parseCourseInfoSnapshot(row.course_info_snapshot);
  const yearLevel = (resolveSnapshotText(courseInfo, "yearLevel", assignment.year_level) ??
    assignment.year_level) as YearLevel;

  return {
    courseId: assignment.course.id,
    courseCode: assignment.course.code,
    courseTitle: assignment.course.title,
    courseAssignmentId: assignment.id,
    facultyId: assignment.faculty?.id ?? null,
    facultyName: resolvePublishedFacultyName(
      row.course_info_snapshot,
      courseInfo,
      assignment.faculty?.name ?? null
    ),
    section: (resolveSnapshotText(courseInfo, "section", assignment.section) ??
      assignment.section) as StudentSection,
    yearLevel,
    yearLevelLabel: getYearLevelDisplay(yearLevel),
    evaluationId: row.id,
    evaluationName: row.deployment_name,
    evaluationStatus: row.status,
    termInstance: toReportTermInstance(row.term_instance),
    instrumentId: row.instrument.id,
    instrumentLabel: instrumentLabel(row.instrument),
    structureSnapshot: row.instrument.structure_snapshot,
    cilosSnapshot: row.cilos_snapshot,
    ciloBindings: row.cilo_question_bindings.map((binding) => ({
      sectionKey: binding.section_key,
      itemKey: binding.item_key,
      ciloId: binding.cilo_id,
      ciloLabel: binding.cilo_description_snapshot,
      ciloDescription: binding.cilo_description_snapshot,
      questionPrompt: binding.question_prompt_snapshot,
    })),
    directPoBindings: row.po_question_bindings.map((binding) => ({
      sectionKey: binding.section_key,
      itemKey: binding.item_key,
      poId: binding.po_id,
      poCode: binding.po_code_snapshot,
      poDescription: binding.po_description_snapshot,
      questionPrompt: binding.question_prompt_snapshot,
    })),
    assignedRespondentCount: row.assignments.length,
    submissions: row.assignments.map((assignment) => ({
      respondentId: assignment.respondent_id,
      responseStatus: assignment.response?.status ?? null,
    })),
    responses,
  };
}

function toCentralGroup(row: CentralGroupRow, responses: ReportResponseRow[]): ReportCentralGroup {
  return {
    deploymentId: row.id,
    deploymentName: row.deployment_name,
    deploymentStatus: row.status,
    targetStakeholder: row.target_stakeholder as TargetStakeholder,
    majorLabel: row.major?.name ?? null,
    yearLevel: row.year_level,
    termInstance: toReportTermInstance(row.term_instance),
    instrumentId: row.instrument.id,
    instrumentLabel: instrumentLabel(row.instrument),
    structureSnapshot: row.instrument.structure_snapshot,
    poBindings: row.po_snapshots.map((binding) => ({
      sectionKey: binding.section_key,
      itemKey: binding.item_key,
      poId: binding.po_id,
      poCode: binding.po_code_snapshot,
      poDescription: binding.po_description_snapshot,
      questionPrompt: binding.question_prompt_snapshot,
    })),
    assignedRespondentCount: row.assignments.length,
    submissions: row.assignments.map((assignment) => ({
      respondentId: assignment.respondent_id,
      responseStatus: assignment.response?.status ?? null,
    })),
    responses,
  };
}
