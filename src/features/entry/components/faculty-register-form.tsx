"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, type Resolver, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { customZodResolver } from "@/lib/forms/zod-resolver";
import { requestFacultyAccess } from "@/lib/actions/faculty-actions";
import { EntryFormMessageView, type EntryFormMessage } from "./entry-form-message";
import {
  acknowledgeEntryLegal,
  ENTRY_LEGAL_REQUIRED_MESSAGE,
  EntryLegalCheckbox,
} from "./entry-legal-acknowledgement";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, ArrowRight, CheckCircle2, GraduationCap } from "lucide-react";

const facultyRequestSchema = z.object({
  program_id: z.string().uuid("Select your primary program affiliation."),
});

type FacultyRequestValues = z.infer<typeof facultyRequestSchema>;

type ProgramOption = {
  id: string;
  name: string;
  code: string;
};

/**
 * Explicit Faculty self-request for signed-in ACD Google holders. Submits a
 * PENDING request only — no affiliation, no workspace — through the
 * backend-owned `requestFacultyAccess` action, which enforces the
 * server-side legal acknowledgement gate before any write.
 *
 * The signed acknowledgement ticket is cleared once the OAuth callback
 * finishes, so a person already signed in cannot hold one when they reach
 * this form. The request writes the FACULTY role, so the acknowledgement is
 * taken deliberately here — exactly as the email-first entry forms do before
 * a gated submit — and the action still verifies the ticket it produced.
 */
export function FacultyRegisterForm({
  email,
  programs,
}: {
  email: string;
  programs: ProgramOption[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<EntryFormMessage>(null);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FacultyRequestValues>({
    resolver: customZodResolver(facultyRequestSchema) as Resolver<FacultyRequestValues>,
    defaultValues: { program_id: "" },
  });

  const getProgramLabel = (id: string) => {
    const program = programs.find((option) => option.id === id);
    return program ? `${program.code} — ${program.name}` : "";
  };

  const onSubmit: SubmitHandler<FacultyRequestValues> = async (data) => {
    setMessage(null);
    if (!legalAccepted) {
      setMessage({ kind: "error", text: ENTRY_LEGAL_REQUIRED_MESSAGE });
      return;
    }
    if (!(await acknowledgeEntryLegal("faculty"))) {
      setMessage({
        kind: "error",
        text: "The legal documents could not be confirmed. Try again.",
      });
      return;
    }
    const result = await requestFacultyAccess({
      program_id: data.program_id,
    });
    if (!result.success) {
      setMessage({ kind: "error", text: result.error ?? "The request was not accepted." });
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="space-y-5 text-center">
        <div className="flex justify-center">
          <span className="bg-success/10 flex size-14 items-center justify-center rounded-full">
            <CheckCircle2 className="text-success size-7" aria-hidden="true" />
          </span>
        </div>
        <div className="space-y-2">
          <h2 className="text-title-md text-foreground font-bold">Request received</h2>
          <p className="text-body-md text-muted-foreground">
            Your Faculty request for {email} is waiting for institutional review. You have no
            Faculty workspace access until your eligibility is confirmed — this waiting state grants
            nothing.
          </p>
        </div>
        <div className="bg-muted/50 border-border text-body-sm text-muted-foreground rounded-lg border p-4 text-left leading-relaxed">
          The Secretary&apos;s office reviews Faculty eligibility. If your request is approved, your
          Faculty workspace opens on your next sign-in. If it is declined, you will see the outcome
          with reapplication steps.
        </div>
        <Button type="button" variant="outline" className="w-full" onClick={() => router.push("/")}>
          Back to the System CLOIE landing
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="border-border bg-surface-muted flex items-center gap-3 rounded-lg border px-4 py-2.5">
        <GraduationCap className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
        <span className="text-body-md text-muted-foreground min-w-0 truncate">{email}</span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="faculty-program">Primary program affiliation</Label>
        <Controller
          name="program_id"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger
                id="faculty-program"
                className="w-full"
                aria-invalid={errors.program_id ? true : undefined}
                aria-describedby={errors.program_id ? "faculty-program-error" : undefined}
              >
                <SelectValue placeholder="Select your primary program">
                  {field.value ? getProgramLabel(field.value) : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.code} — {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.program_id && (
          <p
            id="faculty-program-error"
            role="alert"
            className="text-destructive flex items-center gap-1 text-sm"
          >
            <AlertCircle className="size-3" aria-hidden="true" />
            {errors.program_id.message}
          </p>
        )}
      </div>

      <EntryLegalCheckbox
        id="faculty-legal"
        checked={legalAccepted}
        onCheckedChange={setLegalAccepted}
      />

      <EntryFormMessageView message={message} />

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || !legalAccepted}>
        {isSubmitting ? "Submitting…" : "Submit Faculty request"}
        {!isSubmitting && <ArrowRight className="size-4" data-icon="inline-end" />}
      </Button>
    </form>
  );
}
