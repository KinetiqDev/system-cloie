import { AcademicSemester, AcademicTerm, DeploymentStatus, DeploymentType, Prisma, YearLevel } from "@prisma/client";
import { prisma } from "../../../src/lib/db/prisma";
import { U } from "../constants/ids";

// ─────────────────────────────────────────────────────────────────────────────
// Historical trends backfill (Phase 1 seed data).
//
// Clones the ACTIVE term's course assignments, evaluations (course-bound +
// central), and responses into the two COMPLETED 2025-2026 historical terms so
// analytics aggregations render visible multi-term trend lines.
//
// Quantitative ratings are shifted down deterministically per historical term
// (older term ≈ −0.6 mean, newer term ≈ −0.3 mean) via a stable hash — no
// Math.random, so re-seeds converge instead of drifting. Values stay clamped
// to the 1–5 Likert range. Qualitative items are copied verbatim.
//
// Idempotent: every clone is resolved with find-first before create, and
// re-runs reconcile status/dates/varied ratings instead of duplicating rows.
// The academic-calendar runner wipes fixture-term evaluations on re-seed, so
// this runner must run AFTER the main seed (assignments → evaluations →
// responses) completes.
// ─────────────────────────────────────────────────────────────────────────────

interface HistoricalTermConfig {
  key: string;
  label: string;
  semester: AcademicSemester;
  term: AcademicTerm;
  /** Share of quant items (tenths) dropped by 1 point vs. the ACTIVE baseline. */
  dropTenths: number;
}

const HISTORICAL_TERM_CONFIGS: HistoricalTermConfig[] = [
  {
    key: "2025-2026-1ST",
    label: "2025-2026 1st Semester",
    semester: AcademicSemester.FIRST,
    term: AcademicTerm.FIRST_TERM,
    dropTenths: 6,
  },
  {
    key: "2025-2026-2ND",
    label: "2025-2026 2nd Semester",
    semester: AcademicSemester.SECOND,
    term: AcademicTerm.SECOND_TERM,
    dropTenths: 3,
  },
];

const SUBMITTED_BEFORE_TERM_END_MS = 14 * 24 * 60 * 60 * 1000;

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/** Deterministic varied rating: drops ~dropTenths/10 of items by 1, clamped 1–5. */
function varyRating(
  base: number,
  respondentId: string,
  sectionKey: string,
  itemKey: string,
  termKey: string,
  dropTenths: number
): number {
  const roll = hashString(`${respondentId}|${sectionKey}|${itemKey}|${termKey}`) % 10;
  const delta = roll < dropTenths ? -1 : 0;
  return Math.min(5, Math.max(1, base + delta));
}

function shiftSubmittedAt(source: Date | null, termEnd: Date | null): Date | null {
  if (!source) return null;
  if (!termEnd) return source;
  return new Date(termEnd.getTime() - SUBMITTED_BEFORE_TERM_END_MS);
}

export async function seedHistoricalTrends(activeTermId: string): Promise<void> {
  console.log("  → Resolving historical terms...");
  const schoolYear = await prisma.schoolYear.findUnique({
    where: { code: "2025-2026" },
    select: { id: true },
  });
  if (!schoolYear) {
    console.log("    ⚠️ Skipping historical trends: school year 2025-2026 not found");
    return;
  }

  const historicalTerms: {
    id: string;
    start_date: Date | null;
    end_date: Date | null;
    config: HistoricalTermConfig;
  }[] = [];
  for (const config of HISTORICAL_TERM_CONFIGS) {
    const term = await prisma.academicTermInstance.findFirst({
      where: { school_year_id: schoolYear.id, semester: config.semester, term: config.term },
    });
    if (!term) {
      console.log(`    ⚠️ Skipping ${config.label}: term instance not found`);
      continue;
    }
    historicalTerms.push({ id: term.id, start_date: term.start_date, end_date: term.end_date, config });
  }
  if (historicalTerms.length === 0) return;

  const activeAssignments = await prisma.courseAssignment.findMany({
    where: { term_instance_id: activeTermId },
  });
  if (activeAssignments.length === 0) {
    console.log("    ⚠️ Skipping historical trends: no course assignments in the ACTIVE term");
    return;
  }

  const activeMemberships = await prisma.courseAssignmentMembership.findMany({
    where: { course_assignment_id: { in: activeAssignments.map((a) => a.id) } },
  });
  const membershipsByAssignment = new Map<string, typeof activeMemberships>();
  for (const membership of activeMemberships) {
    const list = membershipsByAssignment.get(membership.course_assignment_id) ?? [];
    list.push(membership);
    membershipsByAssignment.set(membership.course_assignment_id, list);
  }

  const activeCbEvals = await prisma.courseBoundEvaluation.findMany({
    where: { term_instance_id: activeTermId },
    include: {
      targets: true,
      cilo_question_bindings: true,
      assignments: { include: { response: { include: { quant_items: true, qual_items: true } } } },
    },
  });

  const activeCentral = await prisma.centralDeployment.findMany({
    where: { term_instance_id: activeTermId },
    include: {
      plo_snapshots: true,
      assignments: { include: { response: { include: { quant_items: true, qual_items: true } } } },
    },
  });

  for (const hist of historicalTerms) {
    console.log(`  → Cloning ACTIVE term into ${hist.config.label}...`);

    // ── Course assignments + memberships ─────────────────────────────────
    const assignmentIdMap = new Map<string, string>();
    for (const source of activeAssignments) {
      const existing = await prisma.courseAssignment.findFirst({
        where: {
          term_instance_id: hist.id,
          course_id: source.course_id,
          program_id: source.program_id,
          year_level: source.year_level,
          section: source.section,
        },
      });
      const cloned =
        existing ??
        (await prisma.courseAssignment.create({
          data: {
            term_instance_id: hist.id,
            faculty_id: source.faculty_id,
            course_id: source.course_id,
            program_id: source.program_id,
            year_level: source.year_level,
            section: source.section,
            assigned_by: source.assigned_by,
            is_active: true,
          },
        }));
      assignmentIdMap.set(source.id, cloned.id);

      for (const membership of membershipsByAssignment.get(source.id) ?? []) {
        await prisma.courseAssignmentMembership.upsert({
          where: {
            course_assignment_id_student_user_id: {
              course_assignment_id: cloned.id,
              student_user_id: membership.student_user_id,
            },
          },
          update: {
            course_id: cloned.course_id,
            term_instance_id: cloned.term_instance_id,
            program_id: cloned.program_id,
            is_active: true,
            updated_by: U.ADMIN,
            removed_by: null,
            removed_at: null,
          },
          create: {
            course_assignment_id: cloned.id,
            student_user_id: membership.student_user_id,
            course_id: cloned.course_id,
            term_instance_id: cloned.term_instance_id,
            program_id: cloned.program_id,
            is_active: true,
            created_by: U.ADMIN,
            updated_by: U.ADMIN,
          },
        });
      }
    }

    // ── Course-bound evaluations + responses ─────────────────────────────
    for (const source of activeCbEvals) {
      const clonedAssignmentId = assignmentIdMap.get(source.course_assignment_id);
      if (!clonedAssignmentId) continue;

      const evalData = {
        deployment_name: source.deployment_name,
        instrument_version_id: source.instrument_version_id,
        cilos_snapshot: (source.cilos_snapshot ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        course_info_snapshot: (source.course_info_snapshot ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        activation_at: hist.start_date ?? source.activation_at,
        deadline_at: hist.end_date ?? source.deadline_at,
        status: DeploymentStatus.CLOSED,
        published_at: hist.start_date ?? source.published_at,
        term_instance_id: hist.id,
        course_assignment_id: clonedAssignmentId,
      };
      const existingEval = await prisma.courseBoundEvaluation.findFirst({
        where: { course_assignment_id: clonedAssignmentId, term_instance_id: hist.id },
      });
      const cloned = existingEval
        ? await prisma.courseBoundEvaluation.update({ where: { id: existingEval.id }, data: evalData })
        : await prisma.courseBoundEvaluation.create({ data: evalData });

      for (const target of source.targets) {
        await prisma.courseBoundEvaluationTarget.upsert({
          where: {
            course_bound_evaluation_id_program_id_year_level: {
              course_bound_evaluation_id: cloned.id,
              program_id: target.program_id,
              year_level: target.year_level as YearLevel,
            },
          },
          update: {},
          create: {
            course_bound_evaluation_id: cloned.id,
            program_id: target.program_id,
            year_level: target.year_level,
          },
        });
      }

      await prisma.courseBoundCiloQuestionBinding.createMany({
        data: source.cilo_question_bindings.map((binding) => ({
          cilo_description_snapshot: binding.cilo_description_snapshot,
          cilo_id: binding.cilo_id,
          course_bound_evaluation_id: cloned.id,
          item_key: binding.item_key,
          question_prompt_snapshot: binding.question_prompt_snapshot,
          section_key: binding.section_key,
        })),
        skipDuplicates: true,
      });
      const clonedBindings = await prisma.courseBoundCiloQuestionBinding.findMany({
        where: { course_bound_evaluation_id: cloned.id },
      });
      const bindingIdByQuestion = new Map(
        clonedBindings.map((binding) => [`${binding.section_key}|${binding.item_key}`, binding.id])
      );

      for (const sourceAssignment of source.assignments) {
        const existingAssignment = await prisma.evaluationAssignment.findFirst({
          where: { course_bound_id: cloned.id, respondent_id: sourceAssignment.respondent_id },
        });
        const clonedAssignment =
          existingAssignment ??
          (await prisma.evaluationAssignment.create({
            data: { course_bound_id: cloned.id, respondent_id: sourceAssignment.respondent_id },
          }));

        const sourceResponse = sourceAssignment.response;
        if (!sourceResponse) continue;
        await cloneResponse({
          sourceResponse,
          clonedAssignmentId: clonedAssignment.id,
          deploymentType: DeploymentType.COURSE_BOUND,
          deploymentId: cloned.id,
          termKey: hist.config.key,
          dropTenths: hist.config.dropTenths,
          termEnd: hist.end_date,
          bindingIdByQuestion,
        });
      }
    }

    // ── Central deployments + responses ──────────────────────────────────
    for (const source of activeCentral) {
      const deploymentData = {
        deployment_name: source.deployment_name,
        instrument_version_id: source.instrument_version_id,
        program_id: source.program_id,
        major_id: source.major_id,
        year_level: source.year_level,
        target_stakeholder: source.target_stakeholder,
        term: source.term,
        activation_at: hist.start_date ?? source.activation_at,
        deadline_at: hist.end_date ?? source.deadline_at,
        status: DeploymentStatus.CLOSED,
        term_instance_id: hist.id,
      };
      const existingDeployment = await prisma.centralDeployment.findFirst({
        where: {
          term_instance_id: hist.id,
          deployment_name: source.deployment_name,
          instrument_version_id: source.instrument_version_id,
          target_stakeholder: source.target_stakeholder,
        },
      });
      const cloned = existingDeployment
        ? await prisma.centralDeployment.update({ where: { id: existingDeployment.id }, data: deploymentData })
        : await prisma.centralDeployment.create({ data: deploymentData });

      for (const snapshot of source.plo_snapshots) {
        const existingSnapshot = await prisma.centralDeploymentPloSnapshot.findFirst({
          where: {
            central_deployment_id: cloned.id,
            section_key: snapshot.section_key,
            item_key: snapshot.item_key,
          },
        });
        if (!existingSnapshot) {
          await prisma.centralDeploymentPloSnapshot.create({
            data: {
              central_deployment_id: cloned.id,
              plo_id: snapshot.plo_id,
              plo_code_snapshot: snapshot.plo_code_snapshot,
              plo_description_snapshot: snapshot.plo_description_snapshot,
              section_key: snapshot.section_key,
              item_key: snapshot.item_key,
              question_prompt_snapshot: snapshot.question_prompt_snapshot,
            },
          });
        }
      }

      for (const sourceAssignment of source.assignments) {
        const existingAssignment = await prisma.evaluationAssignment.findFirst({
          where: { central_deployment_id: cloned.id, respondent_id: sourceAssignment.respondent_id },
        });
        const clonedAssignment =
          existingAssignment ??
          (await prisma.evaluationAssignment.create({
            data: { central_deployment_id: cloned.id, respondent_id: sourceAssignment.respondent_id },
          }));

        const sourceResponse = sourceAssignment.response;
        if (!sourceResponse) continue;
        await cloneResponse({
          sourceResponse,
          clonedAssignmentId: clonedAssignment.id,
          deploymentType: DeploymentType.CENTRAL,
          deploymentId: cloned.id,
          termKey: hist.config.key,
          dropTenths: hist.config.dropTenths,
          termEnd: hist.end_date,
          bindingIdByQuestion: new Map(),
        });
      }
    }

    console.log(`    ✓ Historical term ready: ${hist.config.label}`);
  }
}

async function cloneResponse(opts: {
  sourceResponse: {
    id: string;
    respondent_id: string;
    status: "IN_PROGRESS" | "SUBMITTED";
    submitted_at: Date | null;
    quant_items: { section_key: string; item_key: string; rating_value: number }[];
    qual_items: { section_key: string; prompt_key: string; text_content: string }[];
  };
  clonedAssignmentId: string;
  deploymentType: DeploymentType;
  deploymentId: string;
  termKey: string;
  dropTenths: number;
  termEnd: Date | null;
  bindingIdByQuestion: Map<string, string>;
}): Promise<void> {
  const { sourceResponse } = opts;
  const existing = await prisma.response.findUnique({
    where: { assignment_id: opts.clonedAssignmentId },
  });
  const responseData = {
    respondent_id: sourceResponse.respondent_id,
    deployment_type: opts.deploymentType,
    deployment_id: opts.deploymentId,
    status: sourceResponse.status,
    submitted_at: shiftSubmittedAt(sourceResponse.submitted_at, opts.termEnd),
  };
  const cloned = existing
    ? await prisma.response.update({ where: { id: existing.id }, data: responseData })
    : await prisma.response.create({
        data: { assignment_id: opts.clonedAssignmentId, ...responseData },
      });

  for (const item of sourceResponse.quant_items) {
    const varied = varyRating(
      item.rating_value,
      sourceResponse.respondent_id,
      item.section_key,
      item.item_key,
      opts.termKey,
      opts.dropTenths
    );
    const existingItem = await prisma.quantitativeResponseItem.findFirst({
      where: { response_id: cloned.id, section_key: item.section_key, item_key: item.item_key },
    });
    if (existingItem) {
      if (existingItem.rating_value !== varied) {
        await prisma.quantitativeResponseItem.update({
          where: { id: existingItem.id },
          data: {
            rating_value: varied,
            cilo_question_binding_id: opts.bindingIdByQuestion.get(`${item.section_key}|${item.item_key}`) ?? null,
          },
        });
      }
    } else {
      await prisma.quantitativeResponseItem.create({
        data: {
          response_id: cloned.id,
          cilo_question_binding_id: opts.bindingIdByQuestion.get(`${item.section_key}|${item.item_key}`) ?? null,
          section_key: item.section_key,
          item_key: item.item_key,
          rating_value: varied,
        },
      });
    }
  }

  for (const item of sourceResponse.qual_items) {
    const existingItem = await prisma.qualitativeResponseItem.findFirst({
      where: { response_id: cloned.id, section_key: item.section_key, prompt_key: item.prompt_key },
    });
    if (!existingItem) {
      await prisma.qualitativeResponseItem.create({
        data: {
          response_id: cloned.id,
          section_key: item.section_key,
          prompt_key: item.prompt_key,
          text_content: item.text_content,
        },
      });
    }
  }
}
