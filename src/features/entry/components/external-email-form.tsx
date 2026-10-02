"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type Resolver, type SubmitHandler, type UseFormReturn } from "react-hook-form";
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
import { EntryField, EntryFieldShell } from "./entry-field";
import { Button } from "@/components/ui/button";
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
/** Step one: the address, then the acknowledgement before anything continues. */
function EmailStep({
  message,
  emailForm,
  onContinue,
  legalAccepted,
  setLegalAccepted,
}: {
  message: EntryFormMessage;
  emailForm: UseFormReturn<EmailStepValues>;
  onContinue: SubmitHandler<EmailStepValues>;
  legalAccepted: boolean;
  setLegalAccepted: (accepted: boolean) => void;
}) {
  const { errors, isSubmitting } = emailForm.formState;

  return (
    <div className="space-y-5">
      <form onSubmit={emailForm.handleSubmit(onContinue)} className="space-y-4" noValidate={false}>
        <EntryField
          id="external-email"
          label="Email address"
          error={errors.email?.message}
          control={{
            type: "email",
            autoComplete: "email",
            inputMode: "email",
            placeholder: "you@example.com",
            ...emailForm.register("email"),
          }}
        />
        <EntryLegalCheckbox
          id="external-legal-initial"
          checked={legalAccepted}
          onCheckedChange={setLegalAccepted}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting || !legalAccepted}>
          {isSubmitting ? "Checking…" : "Continue"}
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

/** Step two: the password for the address already chosen above. */
function PasswordStep({
  email,
  message,
  passwordForm,
  onSignIn,
  onChangeEmail,
  legalAccepted,
  setLegalAccepted,
}: {
  email: string;
  message: EntryFormMessage;
  passwordForm: UseFormReturn<PasswordStepValues>;
  onSignIn: SubmitHandler<PasswordStepValues>;
  onChangeEmail: () => void;
  legalAccepted: boolean;
  setLegalAccepted: (accepted: boolean) => void;
}) {
  const { errors, isSubmitting } = passwordForm.formState;

  return (
    <div className="space-y-5">
      <div className="border-border bg-surface-muted flex min-w-0 items-center justify-between gap-2 rounded-lg border px-3 py-2">
        <span className="text-body-md text-muted-foreground min-w-0 truncate">{email}</span>
        <Button type="button" variant="ghost" onClick={onChangeEmail} className="shrink-0">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Change
        </Button>
      </div>

      <form onSubmit={passwordForm.handleSubmit(onSignIn)} className="space-y-4">
        <EntryFieldShell id="external-password" label="Password" error={errors.password?.message}>
          {(describedBy) => (
            <PasswordInput
              id="external-password"
              autoComplete="current-password"
              placeholder="Enter your password"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={describedBy}
              {...passwordForm.register("password")}
            />
          )}
        </EntryFieldShell>
        <EntryLegalCheckbox
          id="external-legal-password"
          checked={legalAccepted}
          onCheckedChange={setLegalAccepted}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting || !legalAccepted}>
          {isSubmitting ? "Signing in…" : "Sign in"}
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
      <EmailStep
        message={message}
        emailForm={emailForm}
        onContinue={onContinue}
        legalAccepted={legalAccepted}
        setLegalAccepted={setLegalAccepted}
      />
    );
  }

  return (
    <PasswordStep
      email={email}
      message={message}
      passwordForm={passwordForm}
      onSignIn={onSignIn}
      onChangeEmail={changeEmail}
      legalAccepted={legalAccepted}
      setLegalAccepted={setLegalAccepted}
    />
  );
}
