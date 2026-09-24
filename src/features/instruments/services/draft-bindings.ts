import type {
  TemplateCiloQuestionBinding,
  TemplateGoQuestionBinding,
  TemplateStructure,
} from "../types";

/**
 * Draft authoring bindings: identity, validity, and payload projection.
 *
 * A draft holds three parallel views of the same document — the section and
 * question structure, the CILO binding map, and the GO binding map. Structure
 * edits are what break the other two: deleting a section or question, or
 * switching a question to guided open-ended, leaves binding entries pointing at
 * a question that no longer accepts them. This module owns that rule so every
 * caller agrees on what a live binding is, instead of each edit path pruning
 * the maps it happens to remember.
 *
 * One rule governs both axes: a binding is live only while its question exists
 * in the structure and is still Likert. CILO-or-GO exclusivity per question is
 * a separate rule, enforced where the author chooses a binding and again on
 * save; this module never drops a binding to satisfy it, because choosing which
 * axis to discard is not derivable here.
 */

/**
 * Question identity as a structural tuple, never a separator join. Section and
 * question keys are arbitrary nonempty strings that may contain separators, so
 * a joined key would merge distinct questions such as `(a, b:c)` with `(a:b, c)`.
 */
export function encodeQuestionBindingKey(sectionKey: string, itemKey: string): string {
  return JSON.stringify([sectionKey, itemKey]);
}

/** Resolve an encoded key back to its section and question; null for a foreign key. */
function decodeQuestionBindingKey(
  encodedKey: string
): { sectionKey: string; itemKey: string } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(encodedKey);
  } catch {
    return null;
  }

  if (
    !Array.isArray(parsed) ||
    parsed.length !== 2 ||
    typeof parsed[0] !== "string" ||
    typeof parsed[1] !== "string"
  ) {
    return null;
  }

  return { itemKey: parsed[1], sectionKey: parsed[0] };
}

/** CILO bindings by question identity: at most one CILO per question. */
type DraftCiloBindings = Record<string, string>;

/** GO bindings by question identity: a question may carry several GOs. */
type DraftGoBindings = Record<string, string[]>;

/** Question identities that exist in the structure and still accept bindings. */
function liveBindingKeys(structure: TemplateStructure): Set<string> {
  const keys = new Set<string>();
  for (const section of structure) {
    for (const question of section.questions) {
      if (question.type !== "likert") continue;
      keys.add(encodeQuestionBindingKey(section.key, question.key));
    }
  }
  return keys;
}

/** Drop binding keys that no live Likert question carries; keep identity when nothing is dropped. */
export function pruneDraftBindings<T>(
  bindings: Record<string, T>,
  structure: TemplateStructure
): Record<string, T> {
  const live = liveBindingKeys(structure);
  let dropped = false;
  const next: Record<string, T> = {};

  for (const [key, value] of Object.entries(bindings)) {
    if (live.has(key)) {
      next[key] = value;
      continue;
    }
    dropped = true;
  }

  return dropped ? next : bindings;
}

/**
 * The draft CILO question bindings a save must carry: only questions that still
 * exist as Likert items, and only those with a chosen CILO. Draft order is
 * preserved, so the payload matches the order the author worked in, and a
 * malformed or legacy key is skipped rather than thrown on.
 */
export function collectCiloBindings(
  bindings: DraftCiloBindings,
  structure: TemplateStructure
): TemplateCiloQuestionBinding[] {
  const live = liveBindingKeys(structure);
  const collected: TemplateCiloQuestionBinding[] = [];

  for (const [key, ciloId] of Object.entries(bindings)) {
    if (!ciloId || !live.has(key)) continue;
    const decoded = decodeQuestionBindingKey(key);
    if (!decoded) continue;
    collected.push({ ciloId, itemKey: decoded.itemKey, sectionKey: decoded.sectionKey });
  }

  return collected;
}

/**
 * The draft GO question bindings a save must carry. Bindings live only while
 * their Likert question does, so this walks the structure rather than the map:
 * a question deleted or retyped since the GO was chosen simply emits nothing.
 */
export function collectGoBindings(
  structure: TemplateStructure,
  goBindings: DraftGoBindings
): TemplateGoQuestionBinding[] {
  return structure.flatMap((section) =>
    section.questions.flatMap((question) => {
      if (question.type !== "likert") return [];
      const goIds = goBindings[encodeQuestionBindingKey(section.key, question.key)] ?? [];
      return goIds
        .filter(Boolean)
        .map((goId) => ({ itemKey: question.key, goId, sectionKey: section.key }));
    })
  );
}
