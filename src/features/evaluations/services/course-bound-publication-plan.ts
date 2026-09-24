import { CourseBoundEvaluationExclusionCategory, DeploymentStatus } from "@prisma/client";
import type { TemplateStructure } from "@/features/instruments/types";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";
import { isNeutralOtherExplanation } from "../exclusion-text";
import { encodeQuestionKey } from "./central-deployment-go-plan";
import type {
  CourseBoundEvaluationExclusionInput,
  PublishCourseBoundEvaluationResult,
} from "../types";

/** An active roster member an exclusion may target. */
type CourseBoundRosterMember = {
  id: string;
  student_user_id: string;
};

/** A normalized exclusion ready for the publication insert. */
type NormalizedExclusion = {
  category: CourseBoundEvaluationExclusionCategory;
  membershipId: string;
  otherExplanation: string | undefined;
};

/** The frozen CILO snapshot row written at publication. */
type CiloSnapshotRow = {
  description: string;
  id: string;
  label: string;
};

/** The roster plan a publication writes: exclusions plus their recipients. */
type CourseBoundPublicationPlan = {
  ciloSnapshots: CiloSnapshotRow[];
  normalizedExclusions: NormalizedExclusion[];
  respondentIds: string[];
};

/**
 * Expected publication-validation denial. The transaction owner converts it into
 * a `ServiceResult` denial; carrying the Course id lets the Faculty publisher
 * receive a direct repair path to the Course alignment editor.
 */
export class PublicationValidationError extends Error {
  constructor(
    message: string,
    readonly alignmentCourseId?: string
  ) {
    super(message);
  }
}

/**
 * Normalizes and validates the requested exclusions against the authoritative
 * active roster, then derives the recipient set: every active member except the
 * excluded ones. Exclusions are a recorded decision that never changes roster
 * membership, so a membership id outside the active roster, a repeated
 * membership, a malformed Other explanation, or an explanation on a
 * non-Other category all deny the publication before any write. Publication
 * requires at least one recipient.
 */
export function planCourseBoundPublication(input: {
  exclusions: CourseBoundEvaluationExclusionInput[];
  memberships: CourseBoundRosterMember[];
  cilos: Array<{ description: string; id: string }>;
}): CourseBoundPublicationPlan {
  const membershipById = new Map(input.memberships.map((member) => [member.id, member]));
  const normalizedExclusions = input.exclusions.map((exclusion) => ({
    ...exclusion,
    otherExplanation: exclusion.otherExplanation?.trim() || undefined,
  }));
  const excludedMembershipIds = new Set<string>();

  for (const exclusion of normalizedExclusions) {
    if (!membershipById.has(exclusion.membershipId)) {
      throw new PublicationValidationError(
        "Every exclusion must target an active Course-assignment roster member."
      );
    }
    if (excludedMembershipIds.has(exclusion.membershipId)) {
      throw new PublicationValidationError("A roster member can only be excluded once.");
    }
    if (
      exclusion.category === CourseBoundEvaluationExclusionCategory.OTHER &&
      (!exclusion.otherExplanation ||
        exclusion.otherExplanation.length < 5 ||
        exclusion.otherExplanation.length > 200 ||
        !isNeutralOtherExplanation(exclusion.otherExplanation))
    ) {
      throw new PublicationValidationError(
        "Other exclusion explanations must be 5-200 neutral characters without sensitive details."
      );
    }
    if (
      exclusion.category !== CourseBoundEvaluationExclusionCategory.OTHER &&
      exclusion.otherExplanation
    ) {
      throw new PublicationValidationError("Only an Other exclusion may include an explanation.");
    }
    excludedMembershipIds.add(exclusion.membershipId);
  }

  const respondentIds = input.memberships
    .filter((member) => !excludedMembershipIds.has(member.id))
    .map((member) => member.student_user_id);
  if (respondentIds.length === 0) {
    throw new PublicationValidationError(
      "At least one roster member must receive this evaluation."
    );
  }

  return {
    ciloSnapshots: input.cilos.map((cilo, index) => ({
      description: cilo.description,
      id: cilo.id,
      label: `CILO ${index + 1}`,
    })),
    normalizedExclusions,
    respondentIds,
  };
}

/**
 * Builds the publication status from the requested activation time: a future
 * activation schedules the deployment, otherwise it is immediately active.
 */
export function buildPublicationStatus(
  activationAt: Date | null | undefined
): "ACTIVE" | "SCHEDULED" {
  if (activationAt && activationAt.getTime() > Date.now()) {
    return DeploymentStatus.SCHEDULED;
  }

  return DeploymentStatus.ACTIVE;
}

/** A binding row from a Course-bound template awaiting publication validation. */
type CiloQuestionBindingRow = {
  cilo_id: string | null;
  section_key: string;
  item_key: string;
};

/** A frozen CILO-question binding ready for the publication insert. */
type ValidatedCiloBinding = {
  ciloDescriptionSnapshot: string;
  ciloId: string;
  itemKey: string;
  questionPromptSnapshot: string;
  sectionKey: string;
};

/**
 * Lists a template's Likert questions by structural identity.
 *
 * This scanner only reads the stored `structure` column; it never writes a
 * structure, so the accepted spellings are an explicit tolerance list rather
 * than a statement about stored rows. `type: "likert"` is canonical: it is the
 * `QuestionType` union and the only spelling production writes, and it is the
 * rule `listTemplateLikertQuestions` applies for the Faculty publication
 * context. The uppercase spellings are retained for compatibility with this
 * module's previous scanner predicate and for any legacy JSON that may still
 * carry them. Both publication paths therefore agree on the canonical spelling.
 */
function listLikertQuestionsByIdentity(
  structure: TemplateStructure
): Array<{ itemKey: string; prompt: string; sectionKey: string }> {
  const found = new Map<string, { itemKey: string; prompt: string; sectionKey: string }>();

  for (const section of structure) {
    const sectionRecord = section as unknown as Record<string, unknown> | null;
    if (!sectionRecord || !Array.isArray(sectionRecord.questions)) continue;
    const sectionKey = String(sectionRecord.key);

    for (const question of sectionRecord.questions) {
      const record = question as unknown as Record<string, unknown> | null;
      if (!record) continue;
      const isLikert =
        record.type === "likert" || record.type === "LIKERT" || record.question_type === "LIKERT";
      if (!isLikert) continue;

      const entry = { itemKey: String(record.key), prompt: String(record.prompt), sectionKey };
      found.set(encodeQuestionKey(sectionKey, entry.itemKey), entry);
    }
  }

  return [...found.values()];
}

/**
 * Validates a Course-bound template's CILO-question bindings against the
 * template's own Likert questions and the bound course's active CILOs, then
 * freezes the prompt and description the publication will carry.
 *
 * Question identity is a structural tuple, never a separator join, so template
 * keys may contain any nonempty string. Every binding must name a known CILO
 * and a Likert question, no Likert question may carry two CILOs, and every
 * active CILO must be evidenced by at least one question — a CILO may span
 * several questions, so the binding count is unrelated to the CILO count.
 */
export function validateCiloQuestionBindings(input: {
  bindings: CiloQuestionBindingRow[];
  cilos: Array<{ description: string; id: string }>;
  structure: TemplateStructure;
}): { success: true; bindings: ValidatedCiloBinding[] } | { success: false; error: string } {
  const questionByIdentity = new Map(
    listLikertQuestionsByIdentity(input.structure).map((question) => [
      encodeQuestionKey(question.sectionKey, question.itemKey),
      question,
    ])
  );
  const ciloById = new Map(input.cilos.map((cilo) => [cilo.id, cilo]));
  const usedQuestionKeys = new Set<string>();
  const bindings: ValidatedCiloBinding[] = [];

  for (const binding of input.bindings) {
    if (!binding.cilo_id) continue;
    const questionKey = encodeQuestionKey(binding.section_key, binding.item_key);
    const cilo = ciloById.get(binding.cilo_id);
    const question = questionByIdentity.get(questionKey);

    if (!cilo) {
      return { success: false, error: "One or more selected CILOs are invalid." };
    }
    if (!question) {
      return { success: false, error: "CILOs can only be assigned to Likert questions." };
    }
    if (usedQuestionKeys.has(questionKey)) {
      return { success: false, error: "A Likert question can only be assigned one CILO." };
    }

    usedQuestionKeys.add(questionKey);
    bindings.push({
      ciloDescriptionSnapshot: cilo.description,
      ciloId: cilo.id,
      itemKey: binding.item_key,
      questionPromptSnapshot: question.prompt,
      sectionKey: binding.section_key,
    });
  }

  const boundCiloIds = new Set(bindings.map((binding) => binding.ciloId));
  if (input.cilos.some((cilo) => !boundCiloIds.has(cilo.id))) {
    return {
      success: false,
      error: "Every saved CILO must be assigned to at least one Likert question before publishing.",
    };
  }

  return { success: true, bindings };
}

/**
 * Translates a publication failure into the caller-facing result. Expected
 * validation denials keep their message (and the Faculty alignment repair
 * path), a unique-constraint violation means the assignment was published
 * concurrently, and anything else becomes a reference-id failure so the
 * diagnostic detail stays in server-side logs.
 */
export function toPublicationFailure(
  error: unknown,
  context: { actorId: string | undefined; assignmentId: string; referenceId: string }
): Extract<PublishCourseBoundEvaluationResult, { success: false }> {
  if (error instanceof PublicationValidationError) {
    return {
      error: error.message,
      success: false,
      ...(error.alignmentCourseId ? { alignmentCourseId: error.alignmentCourseId } : {}),
    };
  }

  if (isUniqueConstraintError(error)) {
    return {
      error: "This course assignment already has a deployed evaluation.",
      success: false,
    };
  }

  console.error("Failed to publish course-bound evaluation", {
    operation: "publish_course_bound_evaluation",
    actorId: context.actorId,
    assignmentId: context.assignmentId,
    referenceId: context.referenceId,
    error:
      error instanceof Error
        ? {
            name: error.name,
            code:
              typeof error === "object" && error !== null && "code" in error
                ? String(error.code)
                : undefined,
          }
        : { type: typeof error },
  });

  return {
    error: `Failed to publish evaluation. Please try again. Support reference: ${context.referenceId}.`,
    referenceId: context.referenceId,
    success: false,
  };
}
