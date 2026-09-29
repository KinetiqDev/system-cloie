"use client";

import Link from "next/link";
import { useState } from "react";
import { Controller, useForm, type Resolver, type SubmitHandler } from "react-hook-form";
import { customZodResolver } from "@/lib/forms/zod-resolver";
import {
  externalRegisterFormSchema,
  type ExternalRegisterFormValues,
} from "@/lib/schemas/external-entry";
import { registerExternalAccount } from "@/lib/actions/external-entry-actions";
import {
  acknowledgeEntryLegal,
  ENTRY_LEGAL_REQUIRED_MESSAGE,
  EntryLegalCheckbox,
} from "./entry-legal-acknowledgement";
import { GoogleEntryButton } from "./google-entry-button";
import { PasswordInput } from "./password-input";
import { EntryFormMessageView, type EntryFormMessage } from "./entry-form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

/**
 * External registration: the person chooses Alumni or Industry Partner, and
 * supplies the canonical account name at signup — it is never invented from
 * the email address. The response stays neutral about account existence.
 *
 * Acceptance hands off to the code step server-side, so there is no success
 * state to render here: only the failures that keep the person on this page.
 */
export function ExternalRegisterForm() {
  const [message, setMessage] = useState<EntryFormMessage>(null);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ExternalRegisterFormValues>({
    resolver: customZodResolver(externalRegisterFormSchema) as Resolver<ExternalRegisterFormValues>,
    defaultValues: { name: "", email: "", password: "", role: "ALUMNI" },
  });

  const onSubmit: SubmitHandler<ExternalRegisterFormValues> = async (data) => {
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
    const result = await registerExternalAccount(data);
    if (!result.success) {
      setMessage({ kind: "error", text: result.error });
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <fieldset className="space-y-3">
          <legend className="text-label-md text-foreground font-semibold">
            I am registering as
          </legend>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="grid gap-3"
                aria-describedby={errors.role ? "register-role-error" : undefined}
              >
                <label
                  htmlFor="role-alumni"
                  className="border-border has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary-soft/40 flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors"
                >
                  <RadioGroupItem id="role-alumni" value="ALUMNI" className="mt-0.5" />
                  <span>
                    <span className="text-body-md text-foreground block font-semibold">Alumni</span>
                    <span className="text-body-sm text-muted-foreground block">
                      You graduated from Assumption College of Davao.
                    </span>
                  </span>
                </label>
                <label
                  htmlFor="role-industry"
                  className="border-border has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary-soft/40 flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors"
                >
                  <RadioGroupItem id="role-industry" value="INDUSTRY_PARTNER" className="mt-0.5" />
                  <span>
                    <span className="text-body-md text-foreground block font-semibold">
                      Industry Partner
                    </span>
                    <span className="text-body-sm text-muted-foreground block">
                      You represent an organization giving feedback on graduates.
                    </span>
                  </span>
                </label>
              </RadioGroup>
            )}
          />
          {errors.role && (
            <p id="register-role-error" role="alert" className="text-destructive text-sm">
              {errors.role.message}
            </p>
          )}
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="register-name">Full name</Label>
          <Input
            id="register-name"
            type="text"
            autoComplete="name"
            placeholder="Your name as it should appear on your account"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "register-name-error" : undefined}
            {...register("name")}
          />
          {errors.name && (
            <p id="register-name-error" role="alert" className="text-destructive text-sm">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-email">Email address</Label>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "register-email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p id="register-email-error" role="alert" className="text-destructive text-sm">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-password">Password</Label>
          <PasswordInput
            id="register-password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "register-password-error" : undefined}
            {...register("password")}
          />
          {errors.password && (
            <p id="register-password-error" role="alert" className="text-destructive text-sm">
              {errors.password.message}
            </p>
          )}
        </div>
        <EntryLegalCheckbox
          id="register-external-legal"
          checked={legalAccepted}
          onCheckedChange={setLegalAccepted}
        />
        <Button type="submit" className="min-h-12 w-full" disabled={isSubmitting || !legalAccepted}>
          {isSubmitting ? "Creating account…" : "Create account"}
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
        domainNote="Or use any Google account instead — no password needed."
      />

      <p className="text-body-sm text-muted-foreground text-center">
        Already registered?{" "}
        <Link
          href="/login/external"
          className="text-link hover:text-primary-hover font-medium underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
