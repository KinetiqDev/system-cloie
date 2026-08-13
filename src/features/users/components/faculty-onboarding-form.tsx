"use client";

import { useState } from "react";
import { useForm, Controller, type Resolver, type SubmitHandler } from "react-hook-form";
import { customZodResolver } from "@/lib/forms/zod-resolver";
import {
  facultyProfileSchema,
  type FacultyProfileFormValues,
  type FacultyProfileInput,
} from "@/lib/schemas/faculty-profile";
import { createFacultyProfile } from "@/lib/actions/faculty-actions";
import { resetIncompleteRoleClaim } from "@/lib/actions/onboarding-actions";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, ArrowRight, GraduationCap, Mail, UserCircle } from "lucide-react";
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

type FacultyOnboardingFormProps = {
  email: string;
  programs: Program[];
};

export function FacultyOnboardingForm({
  email,
  programs,
}: FacultyOnboardingFormProps) {
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FacultyProfileFormValues>({
    resolver: customZodResolver(facultyProfileSchema) as Resolver<FacultyProfileFormValues>,
    defaultValues: {
      program_id: "",
    },
  });

  const getProgramLabel = (id: string) => {
    const p = programs.find((prog) => prog.id === id);
    return p ? `${p.code} — ${p.name}` : "";
  };

  const onSubmit: SubmitHandler<FacultyProfileFormValues> = async (data) => {
    setGlobalError(null);
    const result = await createFacultyProfile(data as FacultyProfileInput);

    if (result.error) {
      setGlobalError(result.error);
      return;
    }

    if (result.success === true) {
      window.location.assign("/faculty/dashboard");
    }
  };

  return (
    <Card className="border-border overflow-hidden shadow-lg">
      <div className="border-border bg-surface flex items-center justify-between border-b px-6 py-3">
        <span className="text-label-md text-link font-bold tracking-wider uppercase">
          Onboarding
        </span>
        <span className="text-caption text-text-muted">Faculty Profile</span>
      </div>
      <div className="bg-primary h-1 w-full" />

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-8 px-6 py-8 sm:px-8">
          <div className="space-y-1">
            <h1 className="font-heading text-text-primary text-2xl font-black">
              Faculty Profile Setup
            </h1>
            <p className="text-body-sm text-text-secondary">
              Please complete your details and select your primary program affiliation to access the
              faculty portal.
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
              <Label className="text-label-sm text-text-secondary font-semibold tracking-wider uppercase">
                Email Account
              </Label>
              <div className="border-border bg-surface-muted flex items-center gap-3 rounded-lg border px-4 py-2.5">
                <Mail className="text-text-muted size-4 shrink-0" />
                <span className="text-body-md text-text-secondary">{email}</span>
              </div>
            </div>

            {/* Account identity (Google-authoritative, display-only) */}
            <div className="flex items-center gap-2 pt-4">
              <UserCircle className="text-primary size-5" />
              <h2 className="text-label-lg text-link font-bold tracking-wider uppercase">
                Account Identity
              </h2>
            </div>

            <p className="text-body-sm text-text-secondary">
              Your account name comes from your Google account and cannot be edited here.
            </p>

            {/* Section heading "Program Affiliation" */}
            <div className="flex items-center gap-2 pt-4">
              <GraduationCap className="text-primary size-5" />
              <h2 className="text-label-lg text-link font-bold tracking-wider uppercase">
                Program Affiliation
              </h2>
            </div>

            {/* Primary Program */}
            <div className="space-y-2">
              <Label className="text-label-sm text-text-secondary font-semibold tracking-wider uppercase">
                Primary Affiliated Program
              </Label>
              <Controller
                name="program_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className={`w-full ${errors.program_id ? "border-danger" : ""}`}>
                      <SelectValue placeholder="Select primary program">
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
            className="text-text-muted hover:text-text-primary w-full gap-2"
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
