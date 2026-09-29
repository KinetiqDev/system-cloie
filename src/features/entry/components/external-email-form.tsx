"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type Resolver, type SubmitHandler } from "react-hook-form";
import { customZodResolver } from "@/lib/forms/zod-resolver";
import {
  externalEmailContinueSchema,
  externalSignInSchema,
  type ExternalEmailContinueInput,
  type ExternalSignInInput,
} from "@/lib/schemas/external-entry";
import {
  requestExternalEmailContinue,
  signInExternalParticipant,
} from "@/lib/actions/external-entry-actions";
import { GoogleEntryButton } from "./google-entry-button";
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
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";

type EmailStepValues = ExternalEmailContinueInput;
type PasswordStepValues = ExternalSignInInput;

/**
 * Email-first external sign-in: Continue with an email address, then either
 * sign in with a password or continue with Google. Every branch answers with
 * the same neutral shape so no response reveals account existence or
 * provider.
 */
export function ExternalEmailForm({ prefilledEmail }: { prefilledEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(prefilledEmail ?? "");
  const [message, setMessage] = useState<EntryFormMessage>(null);
  const [legalAccepted, setLegalAccepted] = useState(false);

  const requireEntryLegal = async (): Promise<boolean> => {
    if (!legalAccepted) {
      setMessage({ kind: "error", text: ENTRY_LEGAL_REQUIRED_MESSAGE });
      return false;
    }
    const issued = await acknowledgeEntryLegal("external");
    if (!issued) {
      setMessage({
        kind: "error",
        text: "The legal documents could not be confirmed. Try again.",
      });
      return false;
    }
    return true;
  };

  const emailForm = useForm<EmailStepValues>({
    resolver: customZodResolver(externalEmailContinueSchema) as Resolver<EmailStepValues>,
    defaultValues: { email: prefilledEmail ?? "" },
  });

  const passwordForm = useForm<PasswordStepValues>({
    resolver: customZodResolver(externalSignInSchema) as Resolver<PasswordStepValues>,
    defaultValues: { email: prefilledEmail ?? "", password: "" },
  });

  const onContinue: SubmitHandler<EmailStepValues> = async (data) => {
    setMessage(null);
    if (!(await requireEntryLegal())) return;
    const result = await requestExternalEmailContinue(data);
    if (!result.success) {
      setMessage({ kind: "error", text: result.error });
      return;
    }
    setEmail(data.email);
    passwordForm.setValue("email", data.email);
    setMessage({ kind: "success", text: result.message });
  };

  const onSignIn: SubmitHandler<PasswordStepValues> = async (data) => {
    setMessage(null);
    if (!(await requireEntryLegal())) return;
    const result = await signInExternalParticipant(data);
    if (!result.success) {
      setMessage({ kind: "error", text: result.error });
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  const changeEmail = () => {
    setEmail("");
    setMessage(null);
    passwordForm.reset({ email: "", password: "" });
    emailForm.reset({ email: "" });
  };

  if (!email) {
    return (
      <div className="space-y-5">
        <form
          onSubmit={emailForm.handleSubmit(onContinue)}
          className="space-y-4"
          noValidate={false}
        >
          <div className="space-y-2">
            <Label htmlFor="external-email">Email address</Label>
            <Input
              id="external-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              aria-invalid={emailForm.formState.errors.email ? true : undefined}
              aria-describedby={
                emailForm.formState.errors.email ? "external-email-error" : undefined
              }
              {...emailForm.register("email")}
            />
            {emailForm.formState.errors.email && (
              <p id="external-email-error" role="alert" className="text-destructive text-sm">
                {emailForm.formState.errors.email.message}
              </p>
            )}
          </div>
          <EntryLegalCheckbox
            id="external-legal-initial"
            checked={legalAccepted}
            onCheckedChange={setLegalAccepted}
          />
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={emailForm.formState.isSubmitting || !legalAccepted}
          >
            {emailForm.formState.isSubmitting ? "Checking…" : "Continue"}
          </Button>
        </form>

        <EntryFormMessageView message={message} />

        <div className="flex items-center gap-3" aria-hidden="true">
          <Separator className="flex-1" />
          <span className="text-caption text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <GoogleEntryButton
          intent="external"
          roleTitle="Alumni or Industry Partner"
          label="Continue with Google"
          domainNote="Or use any Google account instead."
        />

        <p className="text-body-sm text-muted-foreground text-center">
          New to System CLOIE?{" "}
          <Link
            href="/register/external"
            className="text-link hover:text-primary-hover font-medium underline-offset-4 hover:underline"
          >
            Create an external account
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="border-border bg-surface-muted flex min-w-0 items-center justify-between gap-2 rounded-lg border px-3 py-2">
        <span className="text-body-md text-muted-foreground min-w-0 truncate">{email}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={changeEmail}
          className="min-h-11 shrink-0"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Change
        </Button>
      </div>

      <form onSubmit={passwordForm.handleSubmit(onSignIn)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="external-password">Password</Label>
          <PasswordInput
            id="external-password"
            autoComplete="current-password"
            placeholder="Enter your password"
            aria-invalid={passwordForm.formState.errors.password ? true : undefined}
            aria-describedby={
              passwordForm.formState.errors.password ? "external-password-error" : undefined
            }
            {...passwordForm.register("password")}
          />
          {passwordForm.formState.errors.password && (
            <p id="external-password-error" role="alert" className="text-destructive text-sm">
              {passwordForm.formState.errors.password.message}
            </p>
          )}
        </div>
        <EntryLegalCheckbox
          id="external-legal-password"
          checked={legalAccepted}
          onCheckedChange={setLegalAccepted}
        />
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={passwordForm.formState.isSubmitting || !legalAccepted}
        >
          {passwordForm.formState.isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <EntryFormMessageView message={message} />

      <div className="text-body-sm flex flex-col items-center gap-2 text-center">
        <Link
          href={`/forgot-password?email=${encodeURIComponent(email)}`}
          className="text-link hover:text-primary-hover font-medium underline-offset-4 hover:underline"
        >
          Forgot your password?
        </Link>
        <Link
          href="/register/external"
          className="text-link hover:text-primary-hover font-medium underline-offset-4 hover:underline"
        >
          Create an external account instead
        </Link>
      </div>
    </div>
  );
}
