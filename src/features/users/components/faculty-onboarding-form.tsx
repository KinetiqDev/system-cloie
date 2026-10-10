"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type Resolver, type SubmitHandler } from "react-hook-form";
import { customZodResolver } from "@/lib/forms/zod-resolver";
import {
  facultyProfileSchema,
  type FacultyProfileFormValues,
  type FacultyProfileInput,
} from "@/lib/schemas/faculty-profile";
import { createFacultyProfile } from "@/lib/actions/faculty-actions";
import { resetIncompleteRoleClaim } from "@/lib/actions/onboarding-actions";
import { ROLES } from "@/lib/constants/roles";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  name: string;
  programs: Program[];
};

export function FacultyOnboardingForm({ email, name, programs }: FacultyOnboardingFormProps) {
  const [globalError, setGlobalError] = useState<string | null>(null);
  const router = useRouter();

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
      router.push("/faculty/dashboard");
    }
  };

  return (
    <Card className="border-border overflow-hidden shadow-sm">
      <div className="border-border bg-surface flex items-center justify-between border-b px-6 py-3">
        <span className="text-label-md text-link font-bold tracking-wider uppercase">
          Onboarding
        </span>
        <span className="text-caption text-muted-foreground">Faculty Profile</span>
      </div>
      <div className="bg-primary h-1 w-full" />

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-8 px-6 py-8 sm:px-8">
          <div>
            <h1 className="text-title-lg text-foreground font-bold tracking-tight">
              Faculty Onboarding
            </h1>
            <p className="text-body-sm text-muted-foreground mt-1">
              Select your academic program affiliation to complete registration and access your faculty workspace.
            </p>
          </div>

          {globalError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{globalError}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="faculty-name">Full name</Label>
              <div className="relative">
                <UserCircle className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  id="faculty-name"
                  value={name}
                  readOnly
                  disabled
                  className="bg-muted pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="faculty-email">Institutional email</Label>
              <div className="relative">
                <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  id="faculty-email"
                  value={email}
                  readOnly
                  disabled
                  className="bg-muted pl-9"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="program_id" className="flex items-center gap-1.5">
              <GraduationCap className="size-4" />
              Primary Program Affiliation
            </Label>
            <p className="text-caption text-muted-foreground">
              Choose the program you primarily teach under.
            </p>
            <Controller
              control={control}
              name="program_id"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(val) => {
                    field.onChange(val ?? "");
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="program_id" className="w-full">
                    <SelectValue placeholder="Select your program affiliation">
                      {field.value ? getProgramLabel(field.value) : undefined}
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
              <p
                id="program_id-error"
                className="text-destructive flex items-center gap-1 text-xs"
              >
                <AlertCircle className="size-3" />
                {errors.program_id.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 px-6 pt-2 pb-8 sm:px-8">
          <Button
            type="submit"
            size="lg"
            className="w-full font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Finalizing..." : "Complete Registration"}
            {!isSubmitting && <ArrowRight className="size-4" data-icon="inline-end" />}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={async () => {
              await resetIncompleteRoleClaim(ROLES.FACULTY);
            }}
          >
            <ArrowLeft className="size-4" data-icon="inline-start" />
            Cancel and return to sign in
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
