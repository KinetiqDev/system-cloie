"use client";

import { useState, useTransition } from "react";
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
import {
  commitInstitutionalOutcomeAction,
  prepareCreateInstitutionalOutcomeAction,
  prepareUpdateInstitutionalOutcomeAction,
} from "@/lib/actions/institutional-outcome-actions";
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

type Draft = { code: string; description: string };

export function InstitutionalOutcomeFormDialog({
  mode,
  outcome,
  open,
  onOpenChange,
}: InstitutionalOutcomeFormDialogProps) {
  const [code, setCode] = useState(outcome?.code ?? "");
  const [description, setDescription] = useState(outcome?.description ?? "");
  const [review, setReview] = useState<OutcomeWriteReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function prepare(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draft: Draft = { code: code.trim(), description: description.trim() };
    if (!draft.code || !draft.description) {
      setFieldError("Code and statement are required.");
      return;
    }
    setFieldError(null);
    setError(null);
    startTransition(async () => {
      try {
        const result =
          mode === "create"
            ? await prepareCreateInstitutionalOutcomeAction(draft)
            : await prepareUpdateInstitutionalOutcomeAction({ id: outcome.id, ...draft });
        if (!result.success) {
          setError(result.error);
          return;
        }
        setReview(result.review);
      } catch {
        setError("The Institutional Outcome review could not be prepared. Try again.");
      }
    });
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
          <DialogTitle>
            {review
              ? "Review Institutional Outcome"
              : mode === "create"
                ? "Add Institutional Outcome"
                : "Edit Institutional Outcome"}
          </DialogTitle>
          <DialogDescription>
            {review
              ? "Compare the exact current and proposed catalog state before confirming."
              : mode === "create"
                ? "Add a college-wide outcome common to every Academic Program."
                : "Update the code or statement without changing this outcome’s identity."}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {review ? (
          <ReviewPanel review={review} />
        ) : (
          <form className="flex flex-col gap-4" onSubmit={prepare}>
            <Field data-invalid={fieldError ? true : undefined}>
              <FieldLabel htmlFor={`institutional-outcome-code-${mode}`}>Code</FieldLabel>
              <FieldContent>
                <Input
                  id={`institutional-outcome-code-${mode}`}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="e.g. ILO-1"
                  autoComplete="off"
                  aria-invalid={fieldError ? true : undefined}
                  disabled={isPending}
                />
              </FieldContent>
            </Field>
            <Field data-invalid={fieldError ? true : undefined}>
              <FieldLabel htmlFor={`institutional-outcome-description-${mode}`}>
                Statement
              </FieldLabel>
              <FieldContent>
                <Textarea
                  id={`institutional-outcome-description-${mode}`}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe what graduates should demonstrate..."
                  rows={5}
                  aria-invalid={fieldError ? true : undefined}
                  disabled={isPending}
                />
                <FieldError errors={fieldError ? [{ message: fieldError }] : []} />
              </FieldContent>
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" loading={isPending}>
                {isPending ? "Preparing..." : "Review Changes"}
              </Button>
            </div>
          </form>
        )}
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
