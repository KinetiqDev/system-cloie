"use client";

import { useState } from "react";

import { useForm, Controller, type Resolver, type SubmitHandler } from "react-hook-form";
import { customZodResolver } from "@/lib/forms/zod-resolver";
import {
  alumniProfileSchema,
  type AlumniProfileFormValues,
  type AlumniProfileInput,
} from "@/lib/schemas/alumni-profile";
import { createAlumniProfile } from "@/lib/actions/alumni-actions";
import { resetIncompleteRoleClaim } from "@/lib/actions/onboarding-actions";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, ArrowRight, GraduationCap, Mail, Calendar, UserCircle } from "lucide-react";
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
  majors: { id: string; name: string }[];
};

type AlumniOnboardingFormProps = {
  email: string;
  initialFirstName: string;
  initialLastName: string;
  programs: Program[];
};

export function AlumniOnboardingForm({
  email,
  initialFirstName,
  initialLastName,
  programs,
}: AlumniOnboardingFormProps) {
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AlumniProfileFormValues>({
    resolver: customZodResolver(alumniProfileSchema) as Resolver<AlumniProfileFormValues>,
    defaultValues: {
      first_name: initialFirstName || "",
      last_name: initialLastName || "",
      graduation_year: "",
      program_id: "",
      major_id: "",
    },
  });

  const selectedProgramId = watch("program_id");
  const selectedProgramObj = programs.find((p) => p.id === selectedProgramId);
  const hasMajors = selectedProgramObj?.majors && selectedProgramObj.majors.length > 0;

  const getProgramLabel = (id: string) => {
    const p = programs.find((prog) => prog.id === id);
    return p ? `${p.code} — ${p.name}` : "";
  };

  const getMajorLabel = (id: string) => {
    const m = selectedProgramObj?.majors.find((major) => major.id === id);
    return m ? m.name : "";
  };

  const onSubmit: SubmitHandler<AlumniProfileFormValues> = async (data) => {
    setGlobalError(null);
    const result = await createAlumniProfile(data as AlumniProfileInput);

    if (result.error) {
      setGlobalError(result.error);
      return;
    }

    if (result.success === true) {
      window.location.assign("/alumni/dashboard");
    }
  };

  return (
    <Card className="border-border overflow-hidden shadow-sm">
      <div className="border-border bg-surface flex items-center justify-between border-b px-6 py-3">
        <span className="text-label-md text-link font-bold tracking-wider uppercase">
          Onboarding
        </span>
        <span className="text-caption text-muted-foreground">Alumni Profile</span>
      </div>
      <div className="bg-primary h-1 w-full" />

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-8 px-6 py-8 sm:px-8">
          <div className="space-y-1">
            <h1 className="font-heading text-foreground text-heading-lg font-bold">
              Alumni Profile Setup
            </h1>
            <p className="text-body-sm text-muted-foreground">
              Please provide your graduation details to access the alumni portal.
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

            {/* Identity Information */}
            <div className="flex items-center gap-2 pt-4">
              <UserCircle className="text-primary size-5" />
              <h2 className="text-label-lg text-link font-bold tracking-wider uppercase">
                Identity Information
              </h2>
            </div>

            {/* First & Last name side-by-side grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="first_name"
                  className="text-label-sm text-muted-foreground font-semibold tracking-wider uppercase"
                >
                  First Name
                </Label>
                <Input
                  id="first_name"
                  type="text"
                  placeholder="e.g. John"
                  {...register("first_name")}
                  className={errors.first_name ? "border-danger focus-visible:ring-danger" : ""}
                />
                {errors.first_name && (
                  <p className="text-danger flex items-center gap-1 text-xs">
                    <AlertCircle className="size-3" />
                    {errors.first_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="last_name"
                  className="text-label-sm text-muted-foreground font-semibold tracking-wider uppercase"
                >
                  Last Name
                </Label>
                <Input
                  id="last_name"
                  type="text"
                  placeholder="e.g. Doe"
                  {...register("last_name")}
                  className={errors.last_name ? "border-danger focus-visible:ring-danger" : ""}
                />
                {errors.last_name && (
                  <p className="text-danger flex items-center gap-1 text-xs">
                    <AlertCircle className="size-3" />
                    {errors.last_name.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <GraduationCap className="text-primary size-5" />
              <h2 className="text-label-lg text-link font-bold tracking-wider uppercase">
                Academic Records
              </h2>
            </div>

            {/* Academic Program */}
            <div className="space-y-2">
              <Label className="text-label-sm text-muted-foreground font-semibold tracking-wider uppercase">
                Program Graduated From
              </Label>
              <Controller
                name="program_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className={`w-full ${errors.program_id ? "border-danger" : ""}`}>
                      <SelectValue placeholder="Select your program">
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

            {/* Major — conditional */}
            {hasMajors && (
              <div className="space-y-2">
                <Label className="text-label-sm text-muted-foreground font-semibold tracking-wider uppercase">
                  Major (if applicable)
                </Label>
                <Controller
                  name="major_id"
                  control={control}
                  rules={{
                    required: hasMajors ? "A major is required for this program" : false,
                  }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger className={`w-full ${errors.major_id ? "border-danger" : ""}`}>
                        <SelectValue placeholder="Select your major">
                          {field.value ? getMajorLabel(field.value) : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {selectedProgramObj.majors.map((major) => (
                          <SelectItem key={major.id} value={major.id}>
                            {major.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.major_id && (
                  <p className="text-danger flex items-center gap-1 text-xs">
                    <AlertCircle className="size-3" />
                    {errors.major_id.message}
                  </p>
                )}
              </div>
            )}

            {/* Graduation Year */}
            <div className="space-y-2">
              <Label
                htmlFor="graduation_year"
                className="text-label-sm text-muted-foreground font-semibold tracking-wider uppercase"
              >
                Graduation Year
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                <Input
                  id="graduation_year"
                  type="number"
                  placeholder="e.g. 2023"
                  {...register("graduation_year")}
                  className={`pl-10 ${errors.graduation_year ? "border-danger focus-visible:ring-danger" : ""}`}
                />
              </div>
              {errors.graduation_year && (
                <p className="text-danger flex items-center gap-1 text-xs">
                  <AlertCircle className="size-3" />
                  {errors.graduation_year.message}
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
