/**
 * Question identity helpers for analytics aggregation.
 *
 * Template section/item keys may contain any nonempty string, so every
 * question, binding, contribution, and contributor identity must be a
 * structurally encoded tuple — never a separator join. Separator-joined keys
 * merge distinct questions such as `(a, b:c)` with `(a:b, c)` and silently
 * discard valid ratings.
 */

/** Section/item identity as a structural tuple, never a separator join. */
export function encodeQuestionKey(sectionKey: string, itemKey: string): string {
  return JSON.stringify([sectionKey, itemKey]);
}

/** Evaluation plus question identity as a structural tuple, never a separator join. */
export function encodeBindingKey(
  evaluationId: string,
  sectionKey: string,
  itemKey: string
): string {
  return JSON.stringify([evaluationId, sectionKey, itemKey]);
}

/** Contribution identity as a structural tuple, never a separator join. */
export function encodeContributionKey(
  responseId: string,
  evaluationId: string,
  sectionKey: string,
  itemKey: string,
  goId: string
): string {
  return JSON.stringify([responseId, evaluationId, sectionKey, itemKey, goId]);
}

/** Direct-question contributor identity as a structural tuple. */
export function encodeDirectContributorKey(
  evaluationId: string,
  sectionKey: string,
  itemKey: string
): string {
  return JSON.stringify(["direct", evaluationId, sectionKey, itemKey]);
}
