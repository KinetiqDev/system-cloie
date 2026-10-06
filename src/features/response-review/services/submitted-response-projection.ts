import { TargetStakeholder } from "@prisma/client";
import type { CiloGoMapping } from "@/features/analytics/aggregators/types";
import { resolveItemScaleIdentity } from "@/features/analytics/aggregators/scale-identity";
import {
  getSnapshotSectionItems,
  isSnapshotSection,
} from "@/features/analytics/services/snapshot-structure";
import type { CiloIloMapping } from "./cilo-mappings";
import type { RespondentIdentityContext } from "./respondent-context";
import type {
  IdentifiedSubmittedResponseDetail,
  ReviewAlignmentLayer,
  SubmittedAnswerBinding,
} from "../types";

// ---------------------------------------------------------------------------
// Submitted-response body projection shared by every identified review owner
// (spec §27.4–§27.5)
//
// Authorization and scope are decided by each caller before these pure
// projections run: only SUBMITTED response rows ever reach them. A Program-wide
// response passes empty `ciloBindings`, which yields direct GO bindings or
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

export type GoQuestionBindingSnapshot = {
  go_id: string | null;
  go_code_snapshot: string;
  go_description_snapshot: string;
  section_key: string;
  item_key: string;
};

type SubmittedResponseBindingScope = {
  snapshot: unknown;
  ciloBindings: CourseBoundCiloBinding[];
  goSnapshots: GoQuestionBindingSnapshot[];
  /**
   * Typed alignment layer for the owning Course (ADR 0035). It is decided
   * by Course scope before the projection runs, so a General Education answer
   * can never receive GO rows and a Program-specific answer can never
   * receive ILO rows, whatever the caller happened to load.
   */
  layer: ReviewAlignmentLayer;
};

function resolveSubmittedAnswerBinding(
  scope: SubmittedResponseBindingScope,
  entry: { cilo_question_binding_id: string | null; section_key: string; item_key: string },
  alignments: {
    goMappings: Map<string, CiloGoMapping[]>;
    iloMappings: Map<string, CiloIloMapping[]>;
  }
): SubmittedAnswerBinding {
  const directBindings = scope.goSnapshots
    .filter(
      (snapshot) =>
        snapshot.section_key === entry.section_key && snapshot.item_key === entry.item_key
    )
    .map((snapshot) => ({
      key:
        snapshot.go_id ??
        `snapshot:${snapshot.go_code_snapshot}:${snapshot.go_description_snapshot}`,
      code: snapshot.go_code_snapshot,
      description: snapshot.go_description_snapshot,
    }));

  const binding = scope.ciloBindings.find(
    (candidate) =>
      candidate.id === entry.cilo_question_binding_id ||
      (!entry.cilo_question_binding_id &&
        candidate.section_key === entry.section_key &&
        candidate.item_key === entry.item_key)
  );
  if (!binding) {
    return directBindings.length > 0
      ? { type: "GO", goBindings: directBindings }
      : { type: "GENERAL" };
  }
  if (scope.layer === "INSTITUTIONAL_OUTCOME") {
    return {
      type: "CILO",
      layer: "INSTITUTIONAL_OUTCOME",
      ciloId: binding.cilo_id,
      ciloLabel: binding.cilo_description_snapshot,
      iloMappings: alignments.iloMappings.get(binding.cilo_id ?? "") ?? [],
    };
  }
  return {
    type: "CILO",
    layer: "GRADUATE_OUTCOME",
    ciloId: binding.cilo_id,
    ciloLabel: binding.cilo_description_snapshot,
    goMappings: alignments.goMappings.get(binding.cilo_id ?? "") ?? [],
    directGoBindings: directBindings,
  };
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
    goMappings: Map<string, CiloGoMapping[]>;
    iloMappings: Map<string, CiloIloMapping[]>;
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
