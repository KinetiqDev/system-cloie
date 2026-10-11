import { TargetStakeholder } from "@prisma/client";
import type { CiloGoMapping } from "@/features/analytics/aggregators/types";
import { resolveItemScaleIdentity } from "@/features/analytics/aggregators/scale-identity";
import {
  getSnapshotSectionItems,
  isSnapshotSection,
} from "@/features/analytics/services/snapshot-structure";
import type { CiloIloMapping, CiloCommonMapping } from "./cilo-mappings";
import type { RespondentIdentityContext } from "./respondent-context";
import type {
  IdentifiedSubmittedResponseDetail,
  ProgramWidePoBinding,
  ReviewAlignmentLayer,
  SubmittedAnswerBinding,
} from "../types";

// ---------------------------------------------------------------------------
// Submitted-response body projection shared by every identified review owner
// (spec §27.4–§27.5)
//
// Authorization and scope are decided by each caller before these pure
// projections run: only SUBMITTED response rows ever reach them. A Program-wide
// response passes empty `ciloBindings`, which yields direct PO bindings or
// GENERAL items instead of a CILO binding. The alignment layer is supplied by
// the caller from Course scope, never inferred from the loaded rows.
// ---------------------------------------------------------------------------

export type CourseBoundCiloBinding = {
  id: string;
  cilo_id: string | null;
  cilo_description_snapshot: string;
  section_key: string;
  item_key: string;
};

export type PoQuestionBindingSnapshot = {
  po_id: string | null;
  po_code_snapshot: string;
  po_description_snapshot: string;
  section_key: string;
  item_key: string;
};

type SubmittedResponseBindingScope = {
  snapshot: unknown;
  ciloBindings: CourseBoundCiloBinding[];
  poSnapshots: PoQuestionBindingSnapshot[];
  /**
   * Typed alignment layer for the owning Course (ADR 0035). It is decided
   * by Course scope before the projection runs, so a General Education answer
   * can never receive PO rows and a Program-specific answer can never
   * receive ILO rows, whatever the caller happened to load.
   */
  layer: ReviewAlignmentLayer;
};

/**
 * Direct PO bindings frozen on one course question. A retired PO keeps its
 * `snapshot:<code>:<description>` key so it stays deep-linkable.
 */
function directPoBindings(
  scope: SubmittedResponseBindingScope,
  entry: { section_key: string; item_key: string }
): ProgramWidePoBinding[] {
  return scope.poSnapshots
    .filter(
      (snapshot) =>
        snapshot.section_key === entry.section_key && snapshot.item_key === entry.item_key
    )
    .map((snapshot) => ({
      key:
        snapshot.po_id ??
        `snapshot:${snapshot.po_code_snapshot}:${snapshot.po_description_snapshot}`,
      code: snapshot.po_code_snapshot,
      description: snapshot.po_description_snapshot,
    }));
}

/**
 * The CILO a quantitative answer binds to, matched by its published foreign
 * key when present and otherwise by the question's own section/item keys.
 */
function resolveBoundCilo(
  scope: SubmittedResponseBindingScope,
  entry: { cilo_question_binding_id: string | null; section_key: string; item_key: string }
): CourseBoundCiloBinding | undefined {
  return scope.ciloBindings.find(
    (candidate) =>
      candidate.id === entry.cilo_question_binding_id ||
      (!entry.cilo_question_binding_id &&
        candidate.section_key === entry.section_key &&
        candidate.item_key === entry.item_key)
  );
}

/**
 * CILO binding for the typed alignment layer the owning Course actually
 * reaches (ADR 0035). Each layer carries only its own outcome list, so a
 * Course scope can never publish the wrong table's rows.
 */
function ciloLayerBinding(
  layer: ReviewAlignmentLayer,
  binding: CourseBoundCiloBinding,
  alignments: {
    poMappings: Map<string, CiloGoMapping[]>;
    iloMappings: Map<string, CiloIloMapping[]>;
    commonMappings?: Map<string, CiloCommonMapping[]>;
  },
  directBindings: ProgramWidePoBinding[]
): SubmittedAnswerBinding {
  const ciloId = binding.cilo_id;
  const ciloLabel = binding.cilo_description_snapshot;
  if (layer === "COMMON_PROGRAM_OUTCOME") {
    return {
      type: "CILO",
      layer: "COMMON_PROGRAM_OUTCOME",
      ciloId,
      ciloLabel,
      commonMappings: alignments.commonMappings?.get(ciloId ?? "") ?? [],
    };
  }
  if (layer === "INSTITUTIONAL_OUTCOME") {
    return {
      type: "CILO",
      layer: "INSTITUTIONAL_OUTCOME",
      ciloId,
      ciloLabel,
      iloMappings: alignments.iloMappings.get(ciloId ?? "") ?? [],
    };
  }
  return {
    type: "CILO",
    layer: "GRADUATE_OUTCOME",
    ciloId,
    ciloLabel,
    poMappings: alignments.poMappings.get(ciloId ?? "") ?? [],
    directPoBindings: directBindings,
  };
}

function resolveSubmittedAnswerBinding(
  scope: SubmittedResponseBindingScope,
  entry: { cilo_question_binding_id: string | null; section_key: string; item_key: string },
  alignments: {
    poMappings: Map<string, CiloGoMapping[]>;
    iloMappings: Map<string, CiloIloMapping[]>;
    commonMappings?: Map<string, CiloCommonMapping[]>;
  }
): SubmittedAnswerBinding {
  const directBindings = directPoBindings(scope, entry);
  const binding = resolveBoundCilo(scope, entry);
  if (!binding) {
    return directBindings.length > 0
      ? { type: "PO", poBindings: directBindings }
      : { type: "GENERAL" };
  }
  return ciloLayerBinding(scope.layer, binding, alignments, directBindings);
}

export function buildSubmittedResponseSections(
  response: {
    quant_items: Array<{
      cilo_question_binding_id: string | null;
      section_key: string;
      item_key: string;
      rating_value: number;
    }>;
    qual_items: Array<{ section_key: string; prompt_key: string; text_content: string }>;
  },
  scope: SubmittedResponseBindingScope,
  alignments: {
    poMappings: Map<string, CiloGoMapping[]>;
    iloMappings: Map<string, CiloIloMapping[]>;
    commonMappings?: Map<string, CiloCommonMapping[]>;
  }
): IdentifiedSubmittedResponseDetail["sections"] {
  return (Array.isArray(scope.snapshot) ? scope.snapshot : [])
    .filter(isSnapshotSection)
    .map((section) => {
      const items = getSnapshotSectionItems(section);
      const entries = items.map((item) => {
        if (item.kind === "quantitative") {
          const entry = response.quant_items.find(
            (candidate) => candidate.section_key === section.key && candidate.item_key === item.key
          );
          if (!entry) {
            return null;
          }
          const scale = resolveItemScaleIdentity(scope.snapshot, section.key, item.key);
          return {
            kind: "quantitative" as const,
            itemKey: item.key,
            prompt: item.prompt,
            rating: entry.rating_value,
            scale: scale?.descriptors.map((descriptor) => descriptor.value) ?? [],
            descriptorLabels: scale?.descriptors.map((descriptor) => descriptor.label) ?? [],
            binding: resolveSubmittedAnswerBinding(scope, entry, alignments),
          };
        }
        const entry = response.qual_items.find(
          (candidate) => candidate.section_key === section.key && candidate.prompt_key === item.key
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
        items: entries.filter((entry): entry is NonNullable<typeof entry> => entry !== null),
      };
    })
    .filter((section) => section.items.length > 0);
}

/** Mean over valid ratings; null when no rating resolved or scales are incompatible (§9). */
export function submittedResponseMean(
  sections: IdentifiedSubmittedResponseDetail["sections"],
  snapshot: unknown
): number | null {
  const validRatings: number[] = [];
  const scaleKeys = new Set<string>();
  for (const section of sections) {
    for (const item of section.items) {
      if (item.kind !== "quantitative") {
        continue;
      }
      const scale = resolveItemScaleIdentity(snapshot, section.key, item.itemKey);
      if (scale && scale.descriptors.some((descriptor) => descriptor.value === item.rating)) {
        scaleKeys.add(scale.key);
        validRatings.push(item.rating);
      }
    }
  }
  if (validRatings.length === 0 || scaleKeys.size > 1) {
    return null;
  }
  return validRatings.reduce((sum, value) => sum + value, 0) / validRatings.length;
}

export function respondentIdentityFragment(
  context: RespondentIdentityContext | undefined,
  stakeholder: TargetStakeholder
): Pick<
  IdentifiedSubmittedResponseDetail["respondent"],
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
