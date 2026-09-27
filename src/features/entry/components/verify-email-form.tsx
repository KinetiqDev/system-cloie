"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm, type Resolver, type SubmitHandler } from "react-hook-form";
import { customZodResolver } from "@/lib/forms/zod-resolver";
import {
  resendCodeSchema,
  verifyEmailCodeSchema,
  type ResendCodeInput,
  type VerifyEmailCodeInput,
} from "@/lib/schemas/external-entry";
import { resendVerificationCode, verifyExternalCode } from "@/lib/actions/external-entry-actions";
import {
  acknowledgeEntryLegal,
  ENTRY_LEGAL_REQUIRED_MESSAGE,
  EntryLegalCheckbox,
} from "./entry-legal-acknowledgement";
import { EntryFormMessageView, type EntryFormMessage } from "./entry-form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * 6-digit email verification with resend cooldown. Verification proves inbox
 * control only — the copy never implies institutional approval, and every
 * response stays neutral about account existence.
 */
export function VerifyEmailForm({ prefilledEmail }: { prefilledEmail?: string }) {
  const [message, setMessage] = useState<EntryFormMessage>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [legalAccepted, setLegalAccepted] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<VerifyEmailCodeInput>({
    resolver: customZodResolver(verifyEmailCodeSchema) as Resolver<VerifyEmailCodeInput>,
    defaultValues: { email: prefilledEmail ?? "", token: "" },
  });

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const timer = setTimeout(() => setCooldownLeft((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldownLeft]);

  const ensureEntryLegal = async (): Promise<boolean> => {
    if (!legalAccepted) {
      setMessage({ kind: "error", text: ENTRY_LEGAL_REQUIRED_MESSAGE });
      return false;
    }
    if (!(await acknowledgeEntryLegal("external"))) {
      setMessage({
        kind: "error",
        text: "The legal documents could not be confirmed. Try again.",
      });
      return false;
    }
    return true;
  };

  const onSubmit: SubmitHandler<VerifyEmailCodeInput> = async (data) => {
    setMessage(null);
    if (!(await ensureEntryLegal())) return;
    const result = await verifyExternalCode(data);
    setMessage(
      result.success
        ? { kind: "success", text: result.message }
        : { kind: "error", text: result.error }
    );
  };

  const onResend = async () => {
    if (!(await ensureEntryLegal())) return;
    const email = getValues("email");
    const parsed = resendCodeSchema.safeParse({ email });
    if (!parsed.success) {
      setMessage({ kind: "error", text: "Enter your email address before resending the code." });
      return;
    }
    setMessage(null);
    const result = await resendVerificationCode(parsed.data as ResendCodeInput);
    setMessage(
      result.success
        ? { kind: "success", text: result.message }
        : { kind: "error", text: result.error }
    );
    setCooldownLeft(RESEND_COOLDOWN_SECONDS);
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="verify-email">Email address</Label>
          <Input
            id="verify-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "verify-email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p id="verify-email-error" role="alert" className="text-destructive text-sm">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="verify-code">6-digit verification code</Label>
          <Input
            id="verify-code"
            type="text"
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            className="text-center text-lg tracking-[0.5em] tabular-nums"
            aria-invalid={errors.token ? true : undefined}
            aria-describedby={errors.token ? "verify-code-error" : "verify-code-hint"}
            {...register("token")}
          />
          {!errors.token && (
            <p id="verify-code-hint" className="text-body-sm text-muted-foreground">
              The code expires after its lifetime. No dashboard or evaluation access is granted
              before verification.
            </p>
          )}
          {errors.token && (
            <p id="verify-code-error" role="alert" className="text-destructive text-sm">
              {errors.token.message}
            </p>
          )}
        </div>
        <EntryLegalCheckbox
          id="verify-email-legal"
          checked={legalAccepted}
          onCheckedChange={setLegalAccepted}
        />
        <Button type="submit" className="min-h-12 w-full" disabled={isSubmitting}>
          {isSubmitting ? "Verifying…" : "Verify email"}
        </Button>
      </form>

      <EntryFormMessageView message={message} />

      <div className="text-body-sm flex flex-col items-center gap-2 text-center">
        <Button
          type="button"
          variant="ghost"
          onClick={onResend}
          disabled={cooldownLeft > 0}
          className="min-h-11"
          aria-live="polite"
        >
          {cooldownLeft > 0 ? `Resend code in ${cooldownLeft}s` : "Resend code"}
        </Button>
        <Link
          href="/login/external"
          className="text-link hover:text-primary-hover font-medium underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
