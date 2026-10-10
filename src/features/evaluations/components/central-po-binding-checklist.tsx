import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buildProgramHeadEditToolPath } from "@/lib/constants/program-head-routes";
import { encodeQuestionKey } from "@/features/analytics/aggregators/question-identity";
import type { CentralPublishReadiness } from "../types";

/** Unbound questions listed inline before the rest fold into a disclosure. */
const INLINE_QUESTION_LIMIT = 5;

/**
 * PO binding coverage for the selected Program-wide template: which Likert
 * questions stay unbound, which POs the template covers, and any binding
 * problem that still blocks publication. Unbound questions publish as general
 * evaluation items, so they are named here instead of blocking the publish.
 *
 * `instanceKey` keeps the panel's heading id unique while the publish flow
 * renders the panel on both the configure and preview steps.
 *
 * Text stays on the default foreground over the page background; the tinted
 * muted surface made secondary text fail the color-contrast sweep.
 */
export function CentralPoBindingChecklist({
  instanceKey,
  programId,
  readiness,
}: {
  instanceKey: string;
  programId: string;
  readiness: CentralPublishReadiness;
}) {
  if (readiness.likertCount === 0 && !readiness.blockingError) return null;

  const headingId = `po-coverage-${readiness.templateId}-${instanceKey}`;
  const visible = readiness.unboundQuestions.slice(0, INLINE_QUESTION_LIMIT);
  const folded = readiness.unboundQuestions.slice(INLINE_QUESTION_LIMIT);
  const questionNoun = readiness.likertCount === 1 ? "question" : "questions";
  const poNoun = readiness.coveredGos.length === 1 ? "PO" : "POs";

  return (
    <section aria-labelledby={headingId} className="border-border space-y-3 rounded-lg border p-4">
      <h3 id={headingId} className="text-sm font-semibold">
        PO coverage
      </h3>

      {readiness.blockingError ? (
        <Alert variant="destructive">
          <AlertDescription>{readiness.blockingError}</AlertDescription>
        </Alert>
      ) : null}

      <p className="text-sm">
        {`${readiness.boundQuestionCount} of ${readiness.likertCount} Likert ${questionNoun} bound to a PO`}
        {readiness.coveredGos.length > 0
          ? `, covering ${readiness.coveredGos.length} ${poNoun}.`
          : "."}
      </p>

      {readiness.unboundQuestions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm">
            Unbound questions publish as general evaluation items and give no PO evidence.
          </p>
          <ul className="space-y-1.5 text-sm">
            {visible.map((question) => (
              <li key={encodeQuestionKey(question.sectionKey, question.itemKey)}>
                <span className="block text-xs font-medium">{question.sectionTitle}</span>
                {question.prompt}
              </li>
            ))}
          </ul>
          {folded.length > 0 ? (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium">
                {`Show all ${readiness.unboundQuestions.length} unbound questions`}
              </summary>
              <ul className="mt-2 space-y-1.5">
                {folded.map((question) => (
                  <li key={encodeQuestionKey(question.sectionKey, question.itemKey)}>
                    <span className="block text-xs font-medium">{question.sectionTitle}</span>
                    {question.prompt}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          <Link
            className="text-sm font-medium underline underline-offset-4"
            href={buildProgramHeadEditToolPath(programId, readiness.templateId)}
          >
            Assign POs in the template editor
          </Link>
        </div>
      ) : null}
    </section>
  );
}
