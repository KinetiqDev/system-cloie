"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type Resolver, type SubmitHandler } from "react-hook-form";
import { StudentSection, YearLevel } from "@prisma/client";
import { customZodResolver } from "@/lib/forms/zod-resolver";
import {
  studentProfileSchema,
  deferredStudentProfileSchema,
  type StudentProfileFormValues,
  type StudentProfileInput,
} from "@/lib/schemas/student-profile";
import { registerStudentProfile } from "@/lib/actions/onboarding-actions";
import { createClient } from "@/lib/supabase/client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, ArrowRight, CalendarDays, GraduationCap, Mail, UserCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SECTION_OPTIONS: { label: string; value: StudentSection }[] = [
  { label: "Morning", value: "MORNING" },
  { label: "Afternoon", value: "AFTERNOON" },
  { label: "Evening", value: "EVENING" },
];

type Program = {
  id: string;
  name: string;
  code: string;
  majors: { id: string; name: string }[];
};

type YearLevelType = YearLevel;

type StudentProfileFormProps = {
  email: string;
  programs: Program[];
  yearLevels: YearLevelType[];
  hasActiveTerm: boolean;
};

export function StudentProfileForm({
  email,
  programs,
  yearLevels,
  hasActiveTerm,
}: StudentProfileFormProps) {
  const router = useRouter();
  const [globalError, setGlobalError] = useState<string | null>(null);

  // When there is no active academic term, enrollment fields (year_level, section)
  // are deferred — use the relaxed schema that makes them optional.
  const activeSchema = hasActiveTerm ? studentProfileSchema : deferredStudentProfileSchema;

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StudentProfileFormValues>({
    resolver: customZodResolver(activeSchema) as Resolver<StudentProfileFormValues>,
    defaultValues: {
      program_id: "",
      major_id: "",
      year_level: "",
      student_id_number: "",
      section: "",
    },
  });

  const selectedProgramId = watch("program_id");
  const selectedProgramObj = programs.find((p) => p.id === selectedProgramId);
  const requiresMajor = selectedProgramObj?.majors && selectedProgramObj.majors.length > 0;

  // Lookup helpers to display labels instead of UUIDs
  const getProgramLabel = (id: string) => {
    const p = programs.find((prog) => prog.id === id);
    return p ? `${p.code} — ${p.name}` : "";
  };

  const getMajorLabel = (id: string) => {
    const m = selectedProgramObj?.majors.find((major) => major.id === id);
    return m ? m.name : "";
  };

  const getYearLevelLabel = (value: YearLevel) => {
    const labels: Record<YearLevel, string> = {
      [YearLevel.FIRST_YEAR]: "1st Year",
      [YearLevel.SECOND_YEAR]: "2nd Year",
      [YearLevel.THIRD_YEAR]: "3rd Year",
      [YearLevel.FOURTH_YEAR]: "4th Year",
    };
    return labels[value] ?? value;
  };

  const getSectionLabel = (value: StudentSection | "") => {
    const option = SECTION_OPTIONS.find((opt) => opt.value === value);
    return option ? option.label : "";
  };

  const onSubmit: SubmitHandler<StudentProfileFormValues> = async (data) => {
    setGlobalError(null);
    const result = await registerStudentProfile(data as StudentProfileInput);

    if (result.error) {
      setGlobalError(result.error);
      return;
    }

    if (result.success === true) {
      // Full-page navigation instead of client-side router.push to ensure
      // the (app) layout loads fresh with the newly-created student profile.
      // Client-side push + refresh causes a race between the new route and
      // the stale React cache() session in the current (public) layout.
      window.location.href = "/dashboard";
    }
  };

  return (
    <Card className="border-border overflow-hidden shadow-sm">
      {/* Step indicator header */}
      <div className="border-border bg-surface flex items-center justify-between border-b px-6 py-3">
        <span className="text-label-md text-link font-bold tracking-wider uppercase">
          Onboarding
        </span>
        <span className="text-caption text-muted-foreground">Step 1 of 1</span>
      </div>
      <div className="bg-primary h-1 w-full" />

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-8 px-6 py-8 sm:px-8">
          {/* Page heading */}
          <div className="space-y-1">
            <h1 className="font-heading text-foreground text-heading-lg font-bold">
              Student Profile Setup
            </h1>
            <p className="text-body-sm text-muted-foreground">
              Please provide your academic details to continue with your registration.
            </p>
          </div>

          {globalError && (
            <Alert variant="destructive" className="border-danger/50 bg-danger-soft text-danger">
              <AlertCircle className="size-4" />
              <AlertDescription>{globalError}</AlertDescription>
            </Alert>
          )}

          {/* Deferred enrollment notice — shown when no active academic term is configured */}
          {!hasActiveTerm && (
            <Alert className="border-warning/30 bg-warning-soft/20">
              <CalendarDays className="size-4 text-warning" />
              <AlertDescription className="text-muted-foreground text-body-sm">
                <span className="font-semibold text-warning">Enrollment Deferred</span> — No active
                academic term is currently configured. Your profile will be created, but year level
                and section information will be collected once a term becomes available.
              </AlertDescription>
            </Alert>
          )}

          {/* Section: Account identity (Google-authoritative, display-only) */}
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <UserCircle className="text-primary size-5" />
              <h2 className="text-label-lg text-link font-bold tracking-wider uppercase">
                Account Identity
              </h2>
            </div>

            <p className="text-body-sm text-muted-foreground">
              Your account name comes from your Google account and cannot be edited here.
            </p>

            {/* Institutional Email */}
            <div className="space-y-2">
              <Label className="text-label-sm text-muted-foreground font-semibold tracking-wider uppercase">
                Institutional Email
              </Label>
              <div className="border-border bg-surface-muted flex items-center gap-3 rounded-lg border px-4 py-2.5">
                <Mail className="text-muted-foreground size-4 shrink-0" />
                <span className="text-body-md text-muted-foreground">{email}</span>
              </div>
            </div>
          </div>

          {/* Section: Academic Records */}
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <GraduationCap className="text-primary size-5" />
              <h2 className="text-label-lg text-link font-bold tracking-wider uppercase">
                Academic Records
              </h2>
            </div>

            {/* Academic Program */}
            <div className="space-y-2">
              <Label className="text-label-sm text-muted-foreground font-semibold tracking-wider uppercase">
                Academic Program
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
            <div className="space-y-2">
              <Label className="text-label-sm text-muted-foreground font-semibold tracking-wider uppercase">
                Major (if applicable)
              </Label>
              {requiresMajor ? (
                <Controller
                  name="major_id"
                  control={control}
                  rules={{
                    required: requiresMajor ? "A major is required for this program" : false,
                  }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger className={`w-full ${errors.major_id ? "border-danger" : ""}`}>
                        <SelectValue placeholder="Select your major">
                          {field.value ? getMajorLabel(field.value) : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {selectedProgramObj!.majors.map((major) => (
                          <SelectItem key={major.id} value={major.id}>
                            {major.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              ) : (
                <div className="border-border bg-surface-muted flex items-center rounded-lg border px-4 py-2.5">
                  <span className="text-body-md text-muted-foreground">General / No Major</span>
                </div>
              )}
              {errors.major_id && (
                <p className="text-danger flex items-center gap-1 text-xs">
                  <AlertCircle className="size-3" />
                  {errors.major_id.message}
                </p>
              )}
            </div>

            {/* Student ID only shows when deferred; when active-term it's alongside Year Level */}
            {hasActiveTerm ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="student_id_number"
                    className="text-label-sm text-muted-foreground font-semibold tracking-wider uppercase"
                  >
                    School ID Number
                  </Label>
                  <Input
                    id="student_id_number"
                    placeholder="e.g., 1000571225"
                    {...register("student_id_number")}
                    className={
                      errors.student_id_number ? "border-danger focus-visible:ring-danger" : ""
                    }
                  />
                  {errors.student_id_number && (
                    <p className="text-danger flex items-center gap-1 text-xs">
                      <AlertCircle className="size-3" />
                      Required field
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-label-sm text-muted-foreground font-semibold tracking-wider uppercase">
                    Year Level
                  </Label>
                  <Controller
                    name="year_level"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger
                          className={`w-full ${errors.year_level ? "border-danger" : ""}`}
                        >
                          <SelectValue placeholder="Select year">
                            {field.value ? getYearLevelLabel(field.value as YearLevel) : null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {yearLevels.map((yl) => (
                            <SelectItem key={yl} value={yl}>
                              {getYearLevelLabel(yl)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.year_level && (
                    <p className="text-danger flex items-center gap-1 text-xs">
                      <AlertCircle className="size-3" />
                      {errors.year_level.message}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label
                  htmlFor="student_id_number"
                  className="text-label-sm text-muted-foreground font-semibold tracking-wider uppercase"
                >
                  School ID Number
                </Label>
                <Input
                  id="student_id_number"
                  placeholder="e.g., 1000571225"
                  {...register("student_id_number")}
                  className={
                    errors.student_id_number ? "border-danger focus-visible:ring-danger" : ""
                  }
                />
                {errors.student_id_number && (
                  <p className="text-danger flex items-center gap-1 text-xs">
                    <AlertCircle className="size-3" />
                    Required field
                  </p>
                )}
              </div>
            )}

            {/* Section — only shown when an active term exists */}
            {hasActiveTerm && (
              <div className="space-y-2">
                <Label className="text-label-sm text-muted-foreground font-semibold tracking-wider uppercase">
                  Section
                </Label>
                <Controller
                  name="section"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <SelectTrigger className={`w-full ${errors.section ? "border-danger" : ""}`}>
                        <SelectValue placeholder="Select section">
                          {field.value ? getSectionLabel(field.value) : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {SECTION_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.section && (
                  <p className="text-danger flex items-center gap-1 text-xs">
                    <AlertCircle className="size-3" />
                    {errors.section.message}
                  </p>
                )}
              </div>
            )}
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
              const supabase = createClient();
              await supabase.auth.signOut();
              router.push("/portal/respondents");
            }}
          >
            <ArrowLeft className="size-4" />
            Cancel / Back to Login
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
