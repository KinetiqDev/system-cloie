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

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Mail,
  Building2,
  UserCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      program_id: "",
    },
  });

  const getProgramLabel = (id: string) => {
    const p = programs.find((prog) => prog.id === id);
    return p ? `${p.code} — ${p.name}` : "";
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
    <Card className="border-border overflow-hidden shadow-sm">
      <div className="border-border bg-surface flex items-center justify-between border-b px-6 py-3">
        <span className="text-label-md text-link font-bold tracking-wider uppercase">
          Onboarding
        </span>
        <span className="text-caption text-muted-foreground">Industry Partner Profile</span>
      </div>
      <div className="bg-primary h-1 w-full" />

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-8 px-6 py-8 sm:px-8">
          <div className="space-y-1">
            <h1 className="font-heading text-foreground text-heading-lg font-bold">
              Industry Partner Setup
            </h1>
            <p className="text-body-sm text-muted-foreground">
              Please provide your professional details to access the industry partner portal.
            </p>
          </div>

          {globalError && (
            <Alert variant="destructive" className="border-danger/50 bg-danger-soft text-danger">
              <AlertCircle className="size-4" />
              <AlertDescription>{globalError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-5">
            {/* Institutional / Google Email */}
            <div className="space-y-2">
              <Label className="text-label-sm text-muted-foreground font-semibold tracking-wider uppercase">
                Email Account
              </Label>
              <div className="border-border bg-surface-muted flex items-center gap-3 rounded-lg border px-4 py-2.5">
                <Mail className="text-muted-foreground size-4 shrink-0" />
                <span className="text-body-md text-muted-foreground">{email}</span>
              </div>
            </div>

            {/* Account identity (Google-authoritative, display-only) */}
            <div className="flex items-center gap-2 pt-4">
              <UserCircle className="text-primary size-5" />
              <h2 className="text-label-lg text-link font-bold tracking-wider uppercase">
                Account Identity
              </h2>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="account-name"
                className="text-label-sm text-muted-foreground font-semibold tracking-wider uppercase"
              >
                Account Name
              </Label>
              <div className="relative">
                <UserCircle
                  aria-hidden="true"
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2"
                />
                <Input
                  id="account-name"
                  value={name}
                  readOnly
                  aria-readonly="true"
                  className="bg-surface-muted text-muted-foreground pl-11"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <Briefcase className="text-primary size-5" />
              <h2 className="text-label-lg text-link font-bold tracking-wider uppercase">
                Professional Details
              </h2>
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <Label
                htmlFor="company_name"
                className="text-label-sm text-muted-foreground font-semibold tracking-wider uppercase"
              >
                Company / Organization Name
              </Label>
              <div className="relative">
                <Building2 className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  id="company_name"
                  placeholder="e.g. Acme Corp"
                  {...register("company_name")}
                  className={`pl-10 ${errors.company_name ? "border-danger focus-visible:ring-danger" : ""}`}
                />
              </div>
              {errors.company_name && (
                <p className="text-danger flex items-center gap-1 text-xs">
                  <AlertCircle className="size-3" />
                  {errors.company_name.message}
                </p>
              )}
            </div>

            {/* Position */}
            <div className="space-y-2">
              <Label
                htmlFor="position"
                className="text-label-sm text-muted-foreground font-semibold tracking-wider uppercase"
              >
                Position / Title{" "}
                <span className="text-muted-foreground ml-1 font-normal normal-case">
                  (Optional)
                </span>
              </Label>
              <div className="relative">
                <UserCircle className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  id="position"
                  placeholder="e.g. Senior Engineer"
                  {...register("position")}
                  className={`pl-10 ${errors.position ? "border-danger focus-visible:ring-danger" : ""}`}
                />
              </div>
              {errors.position && (
                <p className="text-danger flex items-center gap-1 text-xs">
                  <AlertCircle className="size-3" />
                  {errors.position.message}
                </p>
              )}
            </div>

            {/* Academic Program Affiliation */}
            <div className="space-y-2">
              <Label className="text-label-sm text-muted-foreground font-semibold tracking-wider uppercase">
                Program Affiliation{" "}
                <span className="text-muted-foreground ml-1 font-normal normal-case">
                  (Optional)
                </span>
              </Label>
              <Controller
                name="program_id"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={(val) => field.onChange(val === "__none" ? "" : val)}
                    value={field.value || "__none"}
                  >
                    <SelectTrigger className={`w-full ${errors.program_id ? "border-danger" : ""}`}>
                      <SelectValue placeholder="Select an affiliated program (if applicable)">
                        {field.value ? getProgramLabel(field.value) : "None"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No specific program</SelectItem>
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
                <p className="text-danger flex items-center gap-1 text-xs">
                  <AlertCircle className="size-3" />
                  {errors.program_id.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 px-6 pt-2 pb-8 sm:px-8">
          <Button
            type="submit"
            className="w-full gap-2 py-6 text-base font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Finalizing..." : "Submit and Continue"}
            {!isSubmitting && <ArrowRight className="size-5" />}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground min-h-11 w-full gap-2"
            onClick={async () => {
              await resetIncompleteRoleClaim();
            }}
          >
            <ArrowLeft className="size-4" />
            Not your role? Go back to role selection
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
