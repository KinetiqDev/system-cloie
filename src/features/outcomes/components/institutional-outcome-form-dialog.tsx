"use client";

import { useTransition, useState } from "react";
import { useForm, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/components/ui/toast";
import { customZodResolver } from "@/lib/forms/zod-resolver";
import {
  commitInstitutionalOutcomeAction,
  prepareCreateInstitutionalOutcomeAction,
  prepareUpdateInstitutionalOutcomeAction,
} from "@/lib/actions/institutional-outcome-actions";
import {
  institutionalOutcomeDraftSchema,
  type InstitutionalOutcomeDraft,
} from "../schemas/institutional-outcome";
import type { OutcomeWriteReview } from "../services/manage-outcome-writes";
import type { InstitutionalOutcomeItem } from "../services/manage-institutional-outcomes";

type InstitutionalOutcomeFormDialogProps =
  | {
      mode: "create";
      outcome?: undefined;
      open: boolean;
      onOpenChange: (open: boolean) => void;
    }
  | {
      mode: "edit";
      outcome: InstitutionalOutcomeItem;
      open: boolean;
      onOpenChange: (open: boolean) => void;
    };

type OutcomeDraftState = {
  register: UseFormRegister<InstitutionalOutcomeDraft>;
  errors: FieldErrors<InstitutionalOutcomeDraft>;
  isPending: boolean;
  disabled: boolean;
  prepare: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function InstitutionalOutcomeFormDialog({
  mode,
  outcome,
  open,
  onOpenChange,
}: InstitutionalOutcomeFormDialogProps) {
  const [review, setReview] = useState<OutcomeWriteReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const copy = dialogCopy(mode, Boolean(review));

  function showPreparedReview(nextReview: OutcomeWriteReview) {
    setError(null);
    setReview(nextReview);
  }

  function commit() {
    if (!review) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await commitInstitutionalOutcomeAction(review, true);
        if (!result.success) {
          setError(result.error);
          setReview(null);
          return;
        }
        onOpenChange(false);
        showToast(
          mode === "create" ? "Institutional Outcome created." : "Institutional Outcome updated."
        );
        router.refresh();
      } catch {
        setError("The Institutional Outcome could not be saved. Try again.");
        setReview(null);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div hidden={Boolean(review)}>
          <OutcomeDraftForm
            mode={mode}
            outcome={outcome}
            isPending={isPending}
            onOpenChange={onOpenChange}
            onPrepared={showPreparedReview}
            onError={setError}
          />
        </div>
        {review && <ReviewPanel review={review} />}
        {review && (
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setReview(null)} disabled={isPending}>
              Back
            </Button>
            <Button onClick={commit} loading={isPending}>
              {isPending ? "Saving..." : "Confirm Changes"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function dialogCopy(mode: InstitutionalOutcomeFormDialogProps["mode"], reviewing: boolean) {
  if (reviewing)
    return {
      title: "Review Institutional Outcome",
      description: "Compare the exact current and proposed catalog state before confirming.",
    };
  if (mode === "create")
    return {
      title: "Add Institutional Outcome",
      description: "Add a college-wide outcome common to every Academic Program.",
    };
  return {
    title: "Edit Institutional Outcome",
    description: "Update the code or statement without changing this outcome’s identity.",
  };
}

type OutcomeDraftFormProps = {
  mode: InstitutionalOutcomeFormDialogProps["mode"];
  outcome: InstitutionalOutcomeItem | undefined;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onPrepared: (review: OutcomeWriteReview) => void;
  onError: (error: string | null) => void;
};

function OutcomeDraftForm({
  mode,
  outcome,
  isPending: parentIsPending,
  onOpenChange,
  onPrepared,
  onError,
}: OutcomeDraftFormProps) {
  const draft = useOutcomeDraft({ mode, outcome, parentIsPending, onPrepared, onError });
  return (
    <form className="flex flex-col gap-4" onSubmit={draft.prepare}>
      <OutcomeDraftFields mode={mode} draft={draft} />
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={draft.disabled}
        >
          Cancel
        </Button>
        <Button type="submit" loading={draft.isPending}>
          {draft.isPending ? "Preparing..." : "Review Changes"}
        </Button>
      </div>
    </form>
  );
}

function useOutcomeDraft({
  mode,
  outcome,
  parentIsPending,
  onPrepared,
  onError,
}: Omit<OutcomeDraftFormProps, "onOpenChange" | "isPending"> & {
  parentIsPending: boolean;
}): OutcomeDraftState {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<InstitutionalOutcomeDraft>({
    resolver: customZodResolver(institutionalOutcomeDraftSchema),
    defaultValues: { code: outcome?.code ?? "", description: outcome?.description ?? "" },
  });

  function prepare(draft: InstitutionalOutcomeDraft) {
    onError(null);
    startTransition(async () => {
      try {
        const result = await prepareOutcomeDraft(mode, outcome, draft);
        if (result.success) onPrepared(result.review);
        else {
          setError("root", { message: result.error });
          onError(result.error);
        }
      } catch {
        const error = "The Institutional Outcome review could not be prepared. Try again.";
        setError("root", { message: error });
        onError(error);
      }
    });
  }

  return {
    register,
    errors,
    isPending,
    disabled: parentIsPending || isPending,
    prepare: handleSubmit(prepare),
  };
}

async function prepareOutcomeDraft(
  mode: InstitutionalOutcomeFormDialogProps["mode"],
  outcome: InstitutionalOutcomeItem | undefined,
  draft: InstitutionalOutcomeDraft
) {
  if (mode === "create") return prepareCreateInstitutionalOutcomeAction(draft);
  return prepareUpdateInstitutionalOutcomeAction({ id: outcome!.id, ...draft });
}

function OutcomeDraftFields({
  mode,
  draft,
}: {
  mode: InstitutionalOutcomeFormDialogProps["mode"];
  draft: OutcomeDraftState;
}) {
  const codeError = draft.errors.code;
  const descriptionError = draft.errors.description;
  const codeErrorId = `institutional-outcome-code-${mode}-error`;
  const descriptionErrorId = `institutional-outcome-description-${mode}-error`;
  return (
    <>
      <Field data-invalid={codeError ? true : undefined}>
        <FieldLabel htmlFor={`institutional-outcome-code-${mode}`}>Code</FieldLabel>
        <FieldContent>
          <Input
            id={`institutional-outcome-code-${mode}`}
            placeholder="e.g. ILO-1"
            autoComplete="off"
            aria-invalid={codeError ? true : undefined}
            aria-describedby={codeError ? codeErrorId : undefined}
            disabled={draft.disabled}
            {...draft.register("code")}
          />
          <FieldError id={codeErrorId} errors={[codeError]} />
        </FieldContent>
      </Field>
      <Field data-invalid={descriptionError ? true : undefined}>
        <FieldLabel htmlFor={`institutional-outcome-description-${mode}`}>Statement</FieldLabel>
        <FieldContent>
          <Textarea
            id={`institutional-outcome-description-${mode}`}
            placeholder="Describe what graduates should demonstrate..."
            rows={5}
            aria-invalid={descriptionError ? true : undefined}
            aria-describedby={descriptionError ? descriptionErrorId : undefined}
            disabled={draft.disabled}
            {...draft.register("description")}
          />
          <FieldError id={descriptionErrorId} errors={[descriptionError]} />
        </FieldContent>
      </Field>
    </>
  );
}
function ReviewPanel({ review }: { review: OutcomeWriteReview }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ReviewState label="Before" value={review.before} />
      <ReviewState label="After" value={review.after} />
    </div>
  );
}

function ReviewState({ label, value }: { label: string; value: unknown }) {
  const records = Array.isArray(value)
    ? value.filter(
        (entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object"
      )
    : value && typeof value === "object"
      ? [value as Record<string, unknown>]
      : [];

  return (
    <section className="bg-muted border-border rounded-lg border p-4" aria-label={label}>
      <h3 className="font-medium">{label}</h3>
      {records.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-3 text-sm">
          {records.map((record, index) => (
            <li
              key={typeof record.id === "string" ? record.id : `${String(record.code)}-${index}`}
              className="border-border flex flex-col gap-2 border-b pb-3 last:border-b-0 last:pb-0"
            >
              <dl className="flex flex-col gap-2">
                {"code" in record && <ReviewValue label="Code" value={String(record.code)} />}
                {"description" in record && (
                  <ReviewValue label="Statement" value={String(record.description)} />
                )}
                {"order" in record && <ReviewValue label="Order" value={String(record.order)} />}
                {"is_active" in record && (
                  <ReviewValue label="State" value={record.is_active ? "Active" : "Archived"} />
                )}
              </dl>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground mt-3 text-sm">No existing Institutional Outcomes.</p>
      )}
    </section>
  );
}

function ReviewValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground break-words">{value}</dd>
    </div>
  );
}
