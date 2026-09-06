export type CourseTextDraft = { code?: string; title?: string };

/**
 * Event-delegation handler that snapshots the uncontrolled code/title inputs
 * of a CourseForm so a draft survives a responsive shell swap (Dialog ↔
 * Drawer crossing the 768px breakpoint remounts the form).
 */
export function captureCourseTextDraft(
  event: React.FormEvent<HTMLElement>,
  setDraft: (updater: (current: CourseTextDraft) => CourseTextDraft) => void
) {
  const target = event.target as HTMLInputElement;
  if (target.name === "code") setDraft((current) => ({ ...current, code: target.value }));
  if (target.name === "title") setDraft((current) => ({ ...current, title: target.value }));
}
