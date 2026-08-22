"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/ui/toast";
import {
  useForm,
  Controller,
  type Control,
  type Path,
  type UseFormRegister,
} from "react-hook-form";
import { SystemRole } from "@prisma/client";
import { customZodResolver } from "@/lib/forms/zod-resolver";
import {
  createUserBySecretarySchema,
  type CreateUserBySecretaryInput,
} from "../schemas/create-user";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { YEAR_LEVEL_OPTIONS, STUDENT_SECTION_OPTIONS } from "@/lib/constants/academic";
import { AlertCircle, Loader2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

type ActionResult = { success: true } | { success: false; error: string };

type AddUserFormProps = {
  programs: Array<{
    id: string;
    code: string;
    name: string;
    majors: Array<{ id: string; name: string }>;
  }>;
  createAction: (formData: FormData) => Promise<ActionResult>;
};

const ROLE_LABELS: Record<SystemRole, string> = {
  [SystemRole.SECRETARY]: "Secretary",
  [SystemRole.DEAN]: "College Dean",
  [SystemRole.PROGRAM_HEAD]: "Program Head",
  [SystemRole.FACULTY]: "Faculty",
  [SystemRole.STUDENT]: "Student",
  [SystemRole.ALUMNI]: "Alumni",
  [SystemRole.INDUSTRY_PARTNER]: "Industry Partner",
  [SystemRole.GEN_ED_COORDINATOR]: "Gen Ed Coordinator",
};

const SINGLE_SELECT_ROLES: SystemRole[] = [
  SystemRole.STUDENT,
  SystemRole.PROGRAM_HEAD,
  SystemRole.FACULTY,
  SystemRole.ALUMNI,
  SystemRole.INDUSTRY_PARTNER,
];

const INTERNAL_EMAIL_HELPER = "Internal roles require an @acd.edu.ph or @acdeducation.com address.";

function needsProgramField(role: SystemRole | undefined): "single" | "none" {
  if (!role) return "none";
  if (SINGLE_SELECT_ROLES.includes(role)) return "single";
  return "none";
}

function isStudentRole(role: SystemRole | undefined): boolean {
  return role === SystemRole.STUDENT;
}

function isAlumniRole(role: SystemRole | undefined): boolean {
  return role === SystemRole.ALUMNI;
}

function isIndustryPartnerRole(role: SystemRole | undefined): boolean {
  return role === SystemRole.INDUSTRY_PARTNER;
}

function getRoleDetailsSectionTitle(role: SystemRole | undefined): string | null {
  if (!role) return null;
  if (role === SystemRole.STUDENT) return "Student details";
  if (role === SystemRole.ALUMNI) return "Alumni details";
  if (role === SystemRole.INDUSTRY_PARTNER) return "Industry partner details";
  if (role === SystemRole.PROGRAM_HEAD || role === SystemRole.FACULTY) {
    return "Program assignment";
  }
  return null;
}

type SelectOption = { value: string; label: string };

type FormControlProps = {
  id: string;
  label: string;
  optional?: boolean;
  helper?: string;
  error?: string;
  children: React.ReactNode;
};

function FormControl({ id, label, optional, helper, error, children }: FormControlProps) {
  const helperId = helper ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-2" data-invalid={error ? "" : undefined}>
      <Label htmlFor={id}>
        {label}
        {optional && (
          <span className="text-text-muted ml-1 font-normal normal-case">(optional)</span>
        )}
      </Label>
      {helper && (
        <p id={helperId} className="text-text-muted text-xs">
          {helper}
        </p>
      )}
      {children}
      {error && (
        <p id={errorId} role="alert" className="text-danger flex items-center gap-1 text-xs">
          <AlertCircle className="size-3" />
          {error}
        </p>
      )}
    </div>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  name: Path<CreateUserBySecretaryInput>;
  register: UseFormRegister<CreateUserBySecretaryInput>;
  error?: string;
  helper?: string;
  optional?: boolean;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
  min?: number | string;
  max?: number | string;
};

function TextField({
  id,
  label,
  name,
  register,
  error,
  helper,
  optional,
  placeholder,
  type = "text",
  min,
  max,
}: TextFieldProps) {
  const describedByIds = [helper ? `${id}-helper` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <FormControl id={id} label={label} optional={optional} helper={helper} error={error}>
      <Input
        id={id}
        type={type}
        min={min}
        max={max}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={describedByIds || undefined}
        {...register(name)}
      />
    </FormControl>
  );
}

type SelectFieldProps = {
  id: string;
  label: string;
  name: Path<CreateUserBySecretaryInput>;
  control: Control<CreateUserBySecretaryInput>;
  value?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  helper?: string;
  optional?: boolean;
  error?: string;
};

function SelectField({
  id,
  label,
  name,
  control,
  value,
  onChange,
  options,
  placeholder,
  helper,
  optional,
  error,
}: SelectFieldProps) {
  const selectedLabel = options.find((option) => option.value === value)?.label;
  const describedByIds = [helper ? `${id}-helper` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <FormControl id={id} label={label} optional={optional} helper={helper} error={error}>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select
            value={value ?? ""}
            onValueChange={(nextValue) => {
              const selectedValue = nextValue ?? "";
              field.onChange(selectedValue);
              onChange?.(selectedValue);
            }}
          >
            <SelectTrigger
              id={id}
              className={cn("w-full", error && "border-destructive")}
              aria-invalid={!!error}
              aria-describedby={describedByIds || undefined}
            >
              <SelectValue placeholder={placeholder}>{selectedLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </FormControl>
  );
}

export function AddUserForm({ programs, createAction }: AddUserFormProps) {
  const router = useRouter();
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserBySecretaryInput>({
    resolver: customZodResolver(createUserBySecretarySchema),
    defaultValues: {
      name: "",
      email: "",
      role: undefined as unknown as SystemRole,
      program_id: undefined,
      major_id: undefined,
      year_level: undefined,
      section: undefined,
      graduation_year: undefined,
      company_name: "",
      position: "",
    },
  });

  const selectedRole = watch("role");
  const selectedProgramId = watch("program_id");
  const programMode = needsProgramField(selectedRole);
  const studentMode = isStudentRole(selectedRole);
  const alumniMode = isAlumniRole(selectedRole);
  const industryPartnerMode = isIndustryPartnerRole(selectedRole);
  const detailsSectionTitle = getRoleDetailsSectionTitle(selectedRole);
  const showDetailsSection = detailsSectionTitle !== null;

  const selectedProgram = programs.find((program) => program.id === selectedProgramId);
  const hasMajors = !!selectedProgram && selectedProgram.majors.length > 0;
  const showMajor = programMode === "single" && (studentMode || alumniMode) && hasMajors;

  const programLabel = studentMode ? "Academic program" : "Affiliated program";

  const roleOptions = Object.values(SystemRole).map((role) => ({
    value: role,
    label: ROLE_LABELS[role],
  }));

  const programOptions = programs.map((program) => ({
    value: program.id,
    label: `${program.code} — ${program.name}`,
  }));

  const majorOptions =
    selectedProgram?.majors.map((major) => ({
      value: major.id,
      label: major.name,
    })) ?? [];

  const yearLevelOptions = YEAR_LEVEL_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  }));

  const sectionOptions = STUDENT_SECTION_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  }));

  function handleRoleChange(newRole: SystemRole) {
    setGlobalError(null);
    clearErrors();
    setValue("role", newRole);

    const resetValues: Partial<CreateUserBySecretaryInput> = {
      program_id: undefined,
      major_id: undefined,
      year_level: undefined,
      section: undefined,
      graduation_year: undefined,
      company_name: "",
      position: "",
    };

    (Object.keys(resetValues) as Array<keyof typeof resetValues>).forEach((fieldName) => {
      setValue(fieldName as Path<CreateUserBySecretaryInput>, resetValues[fieldName] as never);
    });
  }

  const onSubmit = async (data: CreateUserBySecretaryInput) => {
    setGlobalError(null);

    if (showMajor && !data.major_id) {
      setError("major_id", {
        type: "manual",
        message: "Select a major for this program.",
      });
      return;
    }

    const formData = new FormData();
    formData.set("name", data.name);
    formData.set("email", data.email);
    formData.set("role", data.role);

    if (programMode === "single" && data.program_id) {
      formData.set("program_id", data.program_id);
    }

    if (data.major_id) {
      formData.set("major_id", data.major_id);
    }

    if (studentMode) {
      if (data.year_level) {
        formData.set("year_level", data.year_level);
      }
      if (data.section) {
        formData.set("section", data.section);
      }
    }

    if (alumniMode && data.graduation_year != null) {
      formData.set("graduation_year", String(data.graduation_year));
    }

    if (industryPartnerMode) {
      formData.set("company_name", data.company_name ?? "");
      if (data.position) {
        formData.set("position", data.position);
      }
    }

    const result = await createAction(formData);

    if (!result.success) {
      const msg = result.error || "Failed to create user.";
      setGlobalError(msg);
      showToast(msg, "error");
      return;
    }

    // Primary: event-based toast (works when ToastProvider stays mounted).
    // Secondary: query-param toast survives a full-page redirect race.
    showToast("User created successfully.", "success");
    router.push("/secretary/users?toast=User%20created%20successfully.&toastType=success");
  };
  return (
    <Card className="border-border shadow-sm">
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="text-primary size-5" />
            Add new user
          </CardTitle>
          <CardDescription>
            Create a new user account and assign their initial role.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6 px-6 py-6 sm:px-8">
          {globalError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{globalError}</AlertDescription>
            </Alert>
          )}

          <TextField
            id="name"
            label="Name"
            name="name"
            register={register}
            error={errors.name?.message}
            placeholder="Enter full name"
            helper="Provisional name used until the user links their Google account."
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextField
              id="email"
              label="Email address"
              type="email"
              name="email"
              register={register}
              error={errors.email?.message}
              helper={INTERNAL_EMAIL_HELPER}
              placeholder="user@example.com"
            />
            <SelectField
              id="role"
              label="Role"
              name="role"
              control={control}
              value={selectedRole}
              onChange={(value) => handleRoleChange(value as SystemRole)}
              options={roleOptions}
              placeholder="Select a role"
              error={errors.role?.message}
            />
          </div>

          {showDetailsSection && (
            <>
              <Separator />
              <fieldset className="flex min-w-0 flex-col gap-4">
                <legend className="text-label-sm text-text-secondary float-none w-full font-semibold tracking-wider uppercase">
                  {detailsSectionTitle}
                </legend>

                {programMode === "single" && (
                  <SelectField
                    id="program_id"
                    label={programLabel}
                    name="program_id"
                    control={control}
                    value={selectedProgramId}
                    onChange={() => {
                      setValue("major_id", undefined);
                      clearErrors("major_id");
                    }}
                    options={programOptions}
                    placeholder="Select a program"
                    optional={industryPartnerMode}
                    error={errors.program_id?.message}
                  />
                )}

                {showMajor && (
                  <SelectField
                    id="major_id"
                    label="Major"
                    name="major_id"
                    control={control}
                    value={watch("major_id")}
                    options={majorOptions}
                    placeholder="Select a major"
                    helper="Required because the selected program offers majors."
                    error={errors.major_id?.message}
                  />
                )}

                {studentMode && (
                  <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <SelectField
                        id="year_level"
                        label="Year level"
                        name="year_level"
                        control={control}
                        value={watch("year_level")}
                        options={yearLevelOptions}
                        placeholder="Select a year level"
                        error={errors.year_level?.message}
                      />
                      <SelectField
                        id="section"
                        label="Section"
                        name="section"
                        control={control}
                        value={watch("section")}
                        options={sectionOptions}
                        placeholder="Select a section"
                        error={errors.section?.message}
                      />
                    </div>
                  </>
                )}

                {alumniMode && (
                  <TextField
                    id="graduation_year"
                    label="Graduation year"
                    type="number"
                    name="graduation_year"
                    register={register}
                    error={errors.graduation_year?.message}
                    placeholder="e.g. 2023"
                    min={1900}
                    max={2100}
                  />
                )}

                {industryPartnerMode && (
                  <>
                    <TextField
                      id="company_name"
                      label="Company / organization name"
                      name="company_name"
                      register={register}
                      error={errors.company_name?.message}
                      placeholder="e.g. Acme Corporation"
                    />
                    <TextField
                      id="position"
                      label="Position / title"
                      name="position"
                      register={register}
                      error={errors.position?.message}
                      optional
                      placeholder="e.g. Hiring Manager"
                    />
                  </>
                )}
              </fieldset>
            </>
          )}
        </CardContent>

        <CardFooter className="flex-col-reverse gap-3 px-6 pt-2 pb-8 sm:flex-row sm:justify-end sm:px-8">
          <Button
            type="submit"
            className="w-full gap-2 font-semibold sm:w-auto"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" data-icon="inline-start" />
                Creating user…
              </>
            ) : (
              <>
                Create user
                <UserPlus data-icon="inline-end" />
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
