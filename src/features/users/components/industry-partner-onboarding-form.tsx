"use client";

import { useState } from "react";

import { useForm, Controller, type Resolver, type SubmitHandler } from "react-hook-form";
import { customZodResolver } from "@/lib/forms/zod-resolver";
import {
  industryPartnerProfileSchema,
  type IndustryPartnerProfileFormValues,
  type IndustryPartnerProfileInput,
} from "@/lib/schemas/industry-partner-profile";
import { createIndustryPartnerProfile } from "@/lib/actions/industry-partner-actions";
import { resetIncompleteRoleClaim } from "@/lib/actions/onboarding-actions";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, ArrowLeft, ArrowRight, Briefcase, Mail, Building2, UserCircle, GraduationCap } from "lucide-react";

type Program = {
  id: string;
  name: string;
  code: string;
};

type IndustryPartnerOnboardingFormProps = {
  email: string;
  name: string;
  programs: Program[];
};

export function IndustryPartnerOnboardingForm({
  email,
  name,
  programs,
}: IndustryPartnerOnboardingFormProps) {
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<IndustryPartnerProfileFormValues>({
    resolver: customZodResolver(
      industryPartnerProfileSchema
    ) as Resolver<IndustryPartnerProfileFormValues>,
    defaultValues: {
      company_name: "",
      position: "",
      program_ids: [],
    },
  });

  const onInvalid = () => {
    setGlobalError("Please fix the highlighted fields and try again.");
  };

  const onSubmit: SubmitHandler<IndustryPartnerProfileFormValues> = async (data) => {
    setGlobalError(null);
    const result = await createIndustryPartnerProfile(data as IndustryPartnerProfileInput);

    if (result.error) {
      setGlobalError(result.error);
      return;
    }

    if (result.success === true) {
      window.location.assign("/industry-partner/dashboard");
    }
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <span className="text-label-md text-link font-bold tracking-wider uppercase">Onboarding</span>
          <span className="text-caption text-text-muted">Industry Partner Profile</span>
        </div>
        <div className="bg-primary -mx-6 mt-3 h-1 w-[calc(100%+3rem)] sm:-mx-8" />
        <CardTitle className="pt-4 text-2xl font-bold">Industry Partner Setup</CardTitle>
        <CardDescription>Please provide your professional details to access the industry partner portal.</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
        <CardContent className="flex flex-col gap-6 px-6 py-6 sm:px-8">
          {globalError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{globalError}</AlertDescription>
            </Alert>
          )}

          {/* Email — read-only display */}
          <div className="space-y-2">
            <Label htmlFor="email-account" className="text-label-sm text-text-secondary font-semibold tracking-wider uppercase">Email Account</Label>
            <div className="relative">
              <Mail aria-hidden="true" className="text-text-muted pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2" />
              <Input id="email-account" type="email" value={email} readOnly aria-readonly="true" className="bg-surface-muted text-text-secondary pl-11" />
            </div>
          </div>

          {/* Account Identity */}
          <div className="flex items-center gap-2 pt-2">
            <UserCircle className="text-primary size-5" />
            <h2 className="text-label-lg text-link font-bold tracking-wider uppercase">Account Identity</h2>
          </div>
          <p className="text-body-sm text-text-muted -mt-4">
            Your account name comes from your Google account and is not editable during onboarding.
          </p>

          <div className="space-y-2">
            <Label htmlFor="account-name" className="text-label-sm text-text-secondary font-semibold tracking-wider uppercase">
              Account Name
            </Label>
            <div className="relative">
              <UserCircle aria-hidden="true" className="text-text-muted pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2" />
              <Input id="account-name" value={name} readOnly aria-readonly="true" className="bg-surface-muted text-text-secondary pl-11" />
            </div>
          </div>

          <Separator />

          {/* Professional Details */}
          <div className="flex items-center gap-2">
            <Briefcase className="text-primary size-5" />
            <h2 className="text-label-lg text-link font-bold tracking-wider uppercase">Professional Details</h2>
          </div>

          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="company_name" className="text-label-sm text-text-secondary font-semibold tracking-wider uppercase">
              Company / Organization Name
            </Label>
            <div className="relative">
              <Building2 className="text-text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                id="company_name"
                placeholder="e.g. Acme Corp"
                {...register("company_name")}
                aria-invalid={!!errors.company_name}
                aria-describedby={errors.company_name ? "company_name-error" : undefined}
                className={cn("pl-10", errors.company_name && "border-destructive focus-visible:ring-destructive/20")}
              />
            </div>
            {errors.company_name && (
              <p id="company_name-error" className="text-destructive flex items-center gap-1 text-xs">
                <AlertCircle className="size-3" />
                {errors.company_name.message}
              </p>
            )}
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label htmlFor="position" className="text-label-sm text-text-secondary font-semibold tracking-wider uppercase">
              Position / Title
            </Label>
            <div className="relative">
              <UserCircle className="text-text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                id="position"
                placeholder="e.g. Senior Engineer"
                {...register("position")}
                aria-invalid={!!errors.position}
                aria-describedby={errors.position ? "position-error" : undefined}
                className={cn("pl-10", errors.position && "border-destructive focus-visible:ring-destructive/20")}
              />
            </div>
            {errors.position && (
              <p id="position-error" className="text-destructive flex items-center gap-1 text-xs">
                <AlertCircle className="size-3" />
                {errors.position.message}
              </p>
            )}
          </div>

          <Separator />

          {/* Program Affiliations — multi-select */}
          <div className="flex items-center gap-2">
            <GraduationCap className="text-primary size-5" />
            <h2 className="text-label-lg text-link font-bold tracking-wider uppercase">Program Affiliations</h2>
          </div>

          <div className="space-y-2">
            <Label className="text-label-sm text-text-secondary font-semibold tracking-wider uppercase">
              Affiliated Programs
            </Label>
            <p className="text-caption text-text-muted">Select at least one program you are affiliated with.</p>
            <Controller
              name="program_ids"
              control={control}
              render={({ field }) => {
                const selected: string[] = Array.isArray(field.value) ? (field.value as string[]) : [];
                function toggle(programId: string, checked: boolean) {
                  const next = checked ? [...selected, programId] : selected.filter((v) => v !== programId);
                  const deduped = [...new Set(next)];
                  field.onChange(deduped);
                }
                return (
                  <div
                    role="group"
                    aria-label="Affiliated programs"
                    aria-invalid={!!errors.program_ids}
                    aria-describedby={errors.program_ids ? "program_ids-error" : undefined}
                    className={cn(
                      "border-input bg-surface-input flex flex-col gap-1 rounded-xl border p-3",
                      errors.program_ids && "border-destructive"
                    )}
                  >
                    {programs.length === 0 ? (
                      <p className="text-text-muted px-1 py-2 text-sm">No programs available.</p>
                    ) : (
                      programs.map((program) => {
                        const checked = selected.includes(program.id);
                        const checkboxId = `program-${program.id}`;
                        return (
                          <label
                            key={program.id}
                            htmlFor={checkboxId}
                            className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-surface-hover has-[input:focus-visible]:ring-ring/50 has-[input:focus-visible]:ring-2 pointer-coarse:py-3"
                          >
                            <input
                              id={checkboxId}
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => toggle(program.id, e.target.checked)}
                              className="sr-only peer"
                            />
                            <span
                              aria-hidden
                              className={cn(
                                "border-input bg-surface-input peer-focus-visible:ring-ring/50 flex size-5 shrink-0 items-center justify-center rounded-[4px] border peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2",
                                errors.program_ids && "border-destructive"
                              )}
                            >
                              {checked ? (
                                <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                  <path d="M3 8L6.5 11.5L13 4.5" />
                                </svg>
                              ) : null}
                            </span>
                            <span className="text-sm leading-none">
                              {program.code} — {program.name}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                );
              }}
            />
            {errors.program_ids && (
              <p id="program_ids-error" className="text-destructive flex items-center gap-1 text-xs">
                <AlertCircle className="size-3" />
                {errors.program_ids.message}
              </p>
            )}
            {errors.program_id && (
              <p className="text-destructive flex items-center gap-1 text-xs">
                <AlertCircle className="size-3" />
                {errors.program_id.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 px-6 pt-2 pb-8 sm:px-8">
          <Button type="submit" size="lg" className="w-full font-semibold" disabled={isSubmitting}>
            {isSubmitting ? "Finalizing..." : "Submit and Continue"}
            {!isSubmitting && <ArrowRight className="size-4" data-icon="inline-end" />}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="text-text-muted hover:text-text-primary w-full"
            onClick={async () => {
              await resetIncompleteRoleClaim();
            }}
          >
            <ArrowLeft className="size-4" data-icon="inline-start" />
            Not your role? Go back to role selection
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
