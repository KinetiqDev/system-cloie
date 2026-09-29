"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm, type Resolver, type SubmitHandler } from "react-hook-form";
import { customZodResolver } from "@/lib/forms/zod-resolver";
import {
  recoveryConfirmSchema,
  recoveryRequestSchema,
  type RecoveryConfirmInput,
  type RecoveryRequestInput,
} from "@/lib/schemas/external-entry";
import {
  confirmPasswordRecovery,
  requestPasswordRecovery,
} from "@/lib/actions/external-entry-actions";
import {
  acknowledgeEntryLegal,
  ENTRY_LEGAL_REQUIRED_MESSAGE,
  EntryLegalCheckbox,
} from "./entry-legal-acknowledgement";
import { PasswordInput } from "./password-input";
import { EntryFormMessageView, type EntryFormMessage } from "./entry-form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Recovery request: neutral response, never reveals account existence. */
export function ForgotPasswordForm({ prefilledEmail }: { prefilledEmail?: string }) {
  const [message, setMessage] = useState<EntryFormMessage>(null);
  const [legalAccepted, setLegalAccepted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecoveryRequestInput>({
    resolver: customZodResolver(recoveryRequestSchema) as Resolver<RecoveryRequestInput>,
    defaultValues: { email: prefilledEmail ?? "" },
  });

  const onSubmit: SubmitHandler<RecoveryRequestInput> = async (data) => {
    setMessage(null);
    if (!legalAccepted) {
      setMessage({ kind: "error", text: ENTRY_LEGAL_REQUIRED_MESSAGE });
      return;
    }
    if (!(await acknowledgeEntryLegal("external"))) {
      setMessage({
        kind: "error",
        text: "The legal documents could not be confirmed. Try again.",
      });
      return;
    }
    const result = await requestPasswordRecovery(data);
    setMessage(
      result.success
        ? { kind: "success", text: result.message }
        : { kind: "error", text: result.error }
    );
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="recovery-email">Email address</Label>
          <Input
            id="recovery-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "recovery-email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p id="recovery-email-error" role="alert" className="text-destructive text-sm">
              {errors.email.message}
            </p>
          )}
        </div>
        <EntryLegalCheckbox
          id="forgot-password-legal"
          checked={legalAccepted}
          onCheckedChange={setLegalAccepted}
        />
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting || !legalAccepted}
        >
          {isSubmitting ? "Sending…" : "Send recovery code"}
        </Button>
      </form>

      <EntryFormMessageView message={message} />

      {message?.kind === "success" && (
        <p className="text-body-sm text-muted-foreground text-center">
          <Link
            href="/reset-password"
            className="text-link hover:text-primary-hover font-medium underline-offset-4 hover:underline"
          >
            Enter your recovery code
          </Link>
        </p>
      )}

      <p className="text-body-sm text-muted-foreground text-center">
        Remembered it?{" "}
        <Link
          href="/login/external"
          className="text-link hover:text-primary-hover font-medium underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

/**
 * Recovery confirmation: the 6-digit code plus the new password. The session
 * created here is confined to this credential change and ends immediately.
 */
export function ResetPasswordForm({ prefilledEmail }: { prefilledEmail?: string }) {
  const [message, setMessage] = useState<EntryFormMessage>(null);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecoveryConfirmInput>({
    resolver: customZodResolver(recoveryConfirmSchema) as Resolver<RecoveryConfirmInput>,
    defaultValues: { email: prefilledEmail ?? "", token: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit: SubmitHandler<RecoveryConfirmInput> = async (data) => {
    setMessage(null);
    if (!legalAccepted) {
      setMessage({ kind: "error", text: ENTRY_LEGAL_REQUIRED_MESSAGE });
      return;
    }
    if (!(await acknowledgeEntryLegal("external"))) {
      setMessage({
        kind: "error",
        text: "The legal documents could not be confirmed. Try again.",
      });
      return;
    }
    const result = await confirmPasswordRecovery(data);
    setMessage(
      result.success
        ? { kind: "success", text: result.message }
        : { kind: "error", text: result.error }
    );
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-email">Email address</Label>
          <Input
            id="reset-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "reset-email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p id="reset-email-error" role="alert" className="text-destructive text-sm">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reset-code">6-digit recovery code</Label>
          <Input
            id="reset-code"
            type="text"
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            className="text-center text-lg tracking-[0.5em] tabular-nums"
            aria-invalid={errors.token ? true : undefined}
            aria-describedby={errors.token ? "reset-code-error" : undefined}
            {...register("token")}
          />
          {errors.token && (
            <p id="reset-code-error" role="alert" className="text-destructive text-sm">
              {errors.token.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reset-new-password">New password</Label>
          <PasswordInput
            id="reset-new-password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            aria-invalid={errors.newPassword ? true : undefined}
            aria-describedby={errors.newPassword ? "reset-new-password-error" : undefined}
            {...register("newPassword")}
          />
          {errors.newPassword && (
            <p id="reset-new-password-error" role="alert" className="text-destructive text-sm">
              {errors.newPassword.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reset-confirm-password">Confirm new password</Label>
          <PasswordInput
            id="reset-confirm-password"
            autoComplete="new-password"
            placeholder="Repeat your new password"
            aria-invalid={errors.confirmPassword ? true : undefined}
            aria-describedby={errors.confirmPassword ? "reset-confirm-password-error" : undefined}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p id="reset-confirm-password-error" role="alert" className="text-destructive text-sm">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
        <EntryLegalCheckbox
          id="reset-password-legal"
          checked={legalAccepted}
          onCheckedChange={setLegalAccepted}
        />
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting || !legalAccepted}
        >
          {isSubmitting ? "Updating…" : "Set new password"}
        </Button>
      </form>

      <EntryFormMessageView message={message} />

      {message?.kind === "success" && (
        <p className="text-body-sm text-muted-foreground text-center">
          <Link
            href="/login/external"
            className="text-link hover:text-primary-hover font-medium underline-offset-4 hover:underline"
          >
            Sign in with your new password
          </Link>
        </p>
      )}
    </div>
  );
}
