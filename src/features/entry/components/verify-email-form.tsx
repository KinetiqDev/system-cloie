"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm, type Resolver, type SubmitHandler } from "react-hook-form";
import { Lock } from "lucide-react";
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
 *
 * The address arrives already chosen whenever registration just pinned it, and
 * is then shown read-only: re-typing an address a person cannot see is the
 * most common reason a code step fails. A cold visit has nothing pinned, so the
 * field stays editable and the server gate is surfaced as its own control.
 *
 * `legalAcknowledged` is the server's own answer for this browser: when it is
 * true the person already accepted the current documents during registration
 * and the ticket is still valid, so re-asking here would be noise. The gate
 * itself never weakens — the action re-verifies on every call, and an expired
 * ticket re-opens the control below rather than dead-ending the page.
 */
export function VerifyEmailForm({
  email,
  emailLocked,
  legalAcknowledged,
  initialMessage = null,
}: {
  email?: string;
  emailLocked?: boolean;
  legalAcknowledged?: boolean;
  initialMessage?: EntryFormMessage;
}) {
  const [message, setMessage] = useState<EntryFormMessage>(initialMessage);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [legalAccepted, setLegalAccepted] = useState(false);
  // Flips only when a submission comes back needing the acknowledgement the
  // server thought was still valid.
  const [mustAcknowledge, setMustAcknowledge] = useState(!legalAcknowledged);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<VerifyEmailCodeInput>({
    resolver: customZodResolver(verifyEmailCodeSchema) as Resolver<VerifyEmailCodeInput>,
    defaultValues: { email: email ?? "", token: "" },
  });

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const timer = setTimeout(() => setCooldownLeft((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldownLeft]);

  const ensureEntryLegal = async (): Promise<boolean> => {
    if (!mustAcknowledge) return true;
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

  const reportFailure = (result: { error: string; code?: "LEGAL_ACKNOWLEDGEMENT_REQUIRED" }) => {
    if (result.code === "LEGAL_ACKNOWLEDGEMENT_REQUIRED") {
      setMustAcknowledge(true);
    }
    setMessage({ kind: "error", text: result.error });
  };

  const onSubmit: SubmitHandler<VerifyEmailCodeInput> = async (data) => {
    setMessage(null);
    if (!(await ensureEntryLegal())) return;
    const result = await verifyExternalCode(data);
    if (result.success) {
      // A verified identity is already linked to its domain account and the
      // action redirects to the role's onboarding. The message stays as the
      // fallback for the one case with no destination to enter: an address
      // this identity may not claim, where saying nothing more is the honest
      // and enumeration-neutral outcome.
      setMessage({ kind: "success", text: result.message });
      return;
    }
    reportFailure(result);
  };

  const onResend = async () => {
    if (!(await ensureEntryLegal())) return;
    const parsed = resendCodeSchema.safeParse({ email: getValues("email") });
    if (!parsed.success) {
      setMessage({ kind: "error", text: "Enter your email address before resending the code." });
      return;
    }
    setMessage(null);
    const result = await resendVerificationCode(parsed.data as ResendCodeInput);
    if (result.success) {
      setMessage({ kind: "success", text: result.message });
    } else {
      reportFailure(result);
    }
    setCooldownLeft(RESEND_COOLDOWN_SECONDS);
  };

  return (
    <div className="space-y-5">
      {/* Leads the form: on arrival this is the only context the person has,
          and a submit outcome replaces it in the same visible slot. */}
      <EntryFormMessageView message={message} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="verify-email">Email address</Label>
          {emailLocked ? (
            <>
              <div className="relative">
                <Input
                  {...register("email")}
                  id="verify-email"
                  readOnly
                  autoComplete="email"
                  aria-describedby="verify-email-hint"
                  className="bg-surface-muted text-foreground pr-11"
                />
                <Lock
                  className="text-muted-foreground pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2"
                  aria-hidden="true"
                />
              </div>
              <p id="verify-email-hint" className="text-body-sm text-muted-foreground">
                The code goes to this address.
              </p>
              <Link
                href="/register/external"
                aria-describedby="verify-email-hint"
                className="text-link hover:text-primary-hover inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline"
              >
                Registered the wrong address?
              </Link>
            </>
          ) : (
            <>
              <Input
                {...register("email")}
                id="verify-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? "verify-email-error" : undefined}
              />
              {errors.email && (
                <p id="verify-email-error" role="alert" className="text-destructive text-sm">
                  {errors.email.message}
                </p>
              )}
            </>
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
        {mustAcknowledge && (
          <EntryLegalCheckbox
            id="verify-email-legal"
            checked={legalAccepted}
            onCheckedChange={setLegalAccepted}
          />
        )}
        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || (mustAcknowledge && !legalAccepted)}
        >
          {isSubmitting ? "Verifying…" : "Verify email"}
        </Button>
      </form>

      <div className="text-body-sm flex flex-col items-center gap-2 text-center">
        <Button
          type="button"
          variant="ghost"
          onClick={onResend}
          disabled={cooldownLeft > 0 || (mustAcknowledge && !legalAccepted)}
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
