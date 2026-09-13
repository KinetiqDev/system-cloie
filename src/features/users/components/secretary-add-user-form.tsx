"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/ui/toast";
import {
  useForm,
  Controller,
  type Control,
  type Path,
  type Resolver,
  type UseFormRegister,
} from "react-hook-form";
import { SystemRole } from "@prisma/client";
import type { z } from "zod";
import { customZodResolver } from "@/lib/forms/zod-resolver";
import {
  createUserBySecretarySchema,
  type CreateUserBySecretaryInput,
} from "../schemas/create-user";
import { addRoleToExistingUserFormSchema } from "../schemas/add-role-to-existing-user";
import type {
  ExistingAccountLookup,
  LookupUserByEmailResult,
} from "@/lib/actions/secretary-user-lookup-actions";

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
import { Badge } from "@/components/ui/badge";
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
import { AlertCircle, Info, Loader2, UserCheck, UserPlus, UserRoundCog } from "lucide-react";
import { formatRole, getRoleBadgeClass } from "../lib/role-visuals";
import { cn } from "@/lib/utils";

type ActionResult = { success: true } | { success: false; error: string };

/**
 * Creation can report an existing email as a pivot signal: `existingUserId`
 * names the account that already holds the address.
 */
type CreateActionResult =
  | { success: true }
  | { success: false; error: string; existingUserId?: string };

type AddUserFormProps = {
  programs: Array<{
    id: string;
    code: string;
    name: string;
    majors: Array<{ id: string; name: string }>;
  }>;
  createAction: (formData: FormData) => Promise<CreateActionResult>;
  addRoleAction: (formData: FormData) => Promise<ActionResult>;
  lookupUserByEmailAction: (email: string) => Promise<LookupUserByEmailResult>;
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_LOOKUP_DEBOUNCE_MS = 400;

/** Email resolution state for the "does this account already exist?" pivot. */
type EmailLookupState =
  | { status: "idle" }
  | { status: "checking"; email: string }
  | { status: "absent"; email: string }
  | { status: "found"; email: string; user: ExistingAccountLookup }
  | { status: "error"; email: string; error: string };

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

/**
 * Copies the role-context fields the role requires into the action payload.
 * Shared by the create-account and add-role submissions so both actions receive
 * the same FormData shape.
 */
function appendRoleDetails(formData: FormData, role: SystemRole, data: CreateUserBySecretaryInput) {
  if (needsProgramField(role) === "single" && data.program_id) {
    formData.set("program_id", data.program_id);
  }

  if (data.major_id) {
    formData.set("major_id", data.major_id);
  }

  if (isStudentRole(role)) {
    if (data.year_level) {
      formData.set("year_level", data.year_level);
    }
    if (data.section) {
      formData.set("section", data.section);
    }
  }

  if (isAlumniRole(role) && data.graduation_year != null) {
    formData.set("graduation_year", String(data.graduation_year));
  }

  if (isIndustryPartnerRole(role)) {
    formData.set("company_name", data.company_name ?? "");
    if (data.position) {
      formData.set("position", data.position);
    }
  }
}

type SelectOption = { value: string; label: string };

type FormControlProps = {
  id: string;
  label: string;
  optional?: boolean;
  helper?: React.ReactNode;
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
  helper?: React.ReactNode;
  optional?: boolean;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
  min?: number | string;
  max?: number | string;
  onBlur?: () => void;
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
  onBlur,
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
        onBlur={onBlur}
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
  helper?: React.ReactNode;
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

// fallow-ignore-next-line complexity
export function AddUserForm({
  programs,
  createAction,
  addRoleAction,
  lookupUserByEmailAction,
}: AddUserFormProps) {
  const router = useRouter();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [lookup, setLookup] = useState<EmailLookupState>({ status: "idle" });

  const existingUserRef = useRef<ExistingAccountLookup | null>(null);

  const resolver = useMemo<Resolver<CreateUserBySecretaryInput>>(() => {
    const createResolver = customZodResolver(createUserBySecretarySchema);
    // The pivot schema validates the same fields minus `name`; it is used when
    // the email belongs to an existing account, so the action receives role
    // context instead of account-creation data.
    const addRoleResolver = customZodResolver(
      addRoleToExistingUserFormSchema as unknown as z.ZodType<CreateUserBySecretaryInput>
    );

    return (values, context, options) =>
      existingUserRef.current
        ? addRoleResolver(values, context, options)
        : createResolver(values, context, options);
  }, []);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserBySecretaryInput>({
    resolver,
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

  // eslint-disable-next-line react-hooks/incompatible-library -- RHF watch is safe here
  const emailValue = watch("email") ?? "";
  const normalizedEmail = emailValue.trim().toLowerCase();
  const selectedRole = watch("role");
  const selectedProgramId = watch("program_id");

  // Only trust a lookup result that still matches the current email, so a
  // half-edited address can never add a role to the wrong account.
  const existingUser =
    lookup.status === "found" && lookup.email === normalizedEmail ? lookup.user : null;

  useEffect(() => {
    existingUserRef.current = existingUser;
  }, [existingUser]);

  const lookupTimerRef = useRef<number | null>(null);
  const lookupRequestRef = useRef(0);

  const runLookup = useCallback(
    async (email: string) => {
      const requestId = ++lookupRequestRef.current;
      setLookup({ status: "checking", email });

      let result: LookupUserByEmailResult;
      try {
        result = await lookupUserByEmailAction(email);
      } catch {
        if (requestId === lookupRequestRef.current) {
          setLookup({ status: "error", email, error: "Could not check this email. Try again." });
        }
        return;
      }

      if (requestId !== lookupRequestRef.current) return;

      if (!result.success) {
        setLookup({ status: "error", email, error: result.error });
      } else if (result.found) {
        setLookup({ status: "found", email, user: result.user });
      } else {
        setLookup({ status: "absent", email });
      }
    },
    [lookupUserByEmailAction]
  );

  // Check the email after the Secretary stops typing; blur checks immediately.
  useEffect(() => {
    if (lookupTimerRef.current !== null) {
      window.clearTimeout(lookupTimerRef.current);
      lookupTimerRef.current = null;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      lookupRequestRef.current += 1;
      setLookup((previous) => (previous.status === "idle" ? previous : { status: "idle" }));
      return;
    }

    lookupTimerRef.current = window.setTimeout(() => {
      lookupTimerRef.current = null;
      void runLookup(normalizedEmail);
    }, EMAIL_LOOKUP_DEBOUNCE_MS);

    return () => {
      if (lookupTimerRef.current !== null) {
        window.clearTimeout(lookupTimerRef.current);
        lookupTimerRef.current = null;
      }
    };
  }, [normalizedEmail, runLookup]);

  const resetRoleDetails = useCallback(() => {
    clearErrors();
    setValue("program_id", undefined);
    setValue("major_id", undefined);
    setValue("year_level", undefined);
    setValue("section", undefined);
    setValue("graduation_year", undefined);
    setValue("company_name", "");
    setValue("position", "");
  }, [clearErrors, setValue]);

  // Switching between "create account" and "add role" resets the role choice:
  // roles already held by the account must never be carried into either flow.
  const previousExistingUserIdRef = useRef<string | null>(null);
  const nameBeforePivotRef = useRef<string | null>(null);

  useEffect(() => {
    const previousId = previousExistingUserIdRef.current;
    const nextId = existingUser?.id ?? null;
    if (previousId === nextId) return;
    previousExistingUserIdRef.current = nextId;

    setGlobalError(null);
    resetRoleDetails();
    setValue("role", undefined as unknown as SystemRole);

    if (existingUser) {
      nameBeforePivotRef.current = getValues("name") ?? "";
      setValue("name", existingUser.name);
    } else if (previousId !== null) {
      setValue("name", nameBeforePivotRef.current ?? "");
      nameBeforePivotRef.current = null;
    }
  }, [existingUser, getValues, resetRoleDetails, setValue]);

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

  const roleOptions = Object.values(SystemRole)
    .filter((role) => !existingUser?.roles.includes(role))
    .map((role) => ({ value: role, label: ROLE_LABELS[role] }));

  const everyRoleAssigned = existingUser !== null && roleOptions.length === 0;

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

  const emailHelper =
    lookup.status === "checking" ? (
      <span className="inline-flex items-center gap-1">
        <Loader2 className="size-3 animate-spin" />
        Checking this email…
      </span>
    ) : lookup.status === "error" ? (
      lookup.error
    ) : lookup.status === "absent" ? (
      "No existing account found. Submitting will create a new user account."
    ) : (
      INTERNAL_EMAIL_HELPER
    );

  const roleHelper = existingUser
    ? everyRoleAssigned
      ? "This account already holds every role."
      : "Only roles this account does not hold yet are listed."
    : undefined;

  function handleEmailBlur() {
    if (lookupTimerRef.current !== null) {
      window.clearTimeout(lookupTimerRef.current);
      lookupTimerRef.current = null;
    }
    if (!EMAIL_PATTERN.test(normalizedEmail)) return;

    const alreadyResolved =
      (lookup.status === "checking" || lookup.status === "found" || lookup.status === "absent") &&
      lookup.email === normalizedEmail;
    if (alreadyResolved) return;

    void runLookup(normalizedEmail);
  }

  function handleRoleChange(newRole: SystemRole) {
    setGlobalError(null);
    resetRoleDetails();
    setValue("role", newRole);
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

    if (existingUser) {
      if (existingUser.roles.includes(data.role)) {
        setError("role", {
          type: "manual",
          message: `${formatRole(data.role)} is already assigned to ${existingUser.name}.`,
        });
        return;
      }

      const formData = new FormData();
      formData.set("user_id", existingUser.id);
      formData.set("role", data.role);
      appendRoleDetails(formData, data.role, data);

      const result = await addRoleAction(formData);

      if (!result.success) {
        const msg = result.error || "Failed to add role.";
        setGlobalError(msg);
        showToast(msg, "error");
        return;
      }

      router.push(
        `/secretary/users?toast=${encodeURIComponent("Role added successfully.")}&toastType=success`
      );
      return;
    }

    const formData = new FormData();
    formData.set("name", data.name);
    formData.set("email", data.email);
    formData.set("role", data.role);
    appendRoleDetails(formData, data.role, data);

    const result = await createAction(formData);

    if (!result.success) {
      // The account was created after the pre-submit check (or the check could
      // not run): resolve the lookup so the form pivots to granting a role.
      if (result.existingUserId) {
        showToast(
          "This email already belongs to an account. Choose a role to add instead.",
          "error"
        );
        void runLookup(data.email);
        return;
      }

      const msg = result.error || "Failed to create user.";
      setGlobalError(msg);
      showToast(msg, "error");
      return;
    }

    // Query-param toast: consumed by ToastProvider on arrival; the users page
    // carries it through its canonicalization redirect.
    router.push(
      `/secretary/users?toast=${encodeURIComponent("User created successfully.")}&toastType=success`
    );
  };
  return (
    <Card className="border-border shadow-sm">
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            {existingUser ? (
              <UserRoundCog className="text-primary size-5" />
            ) : (
              <UserPlus className="text-primary size-5" />
            )}
            {existingUser ? "Add role to existing user" : "Add new user"}
          </CardTitle>
          <CardDescription>
            {existingUser
              ? "This email already belongs to a CLOIE account. Add another role instead of creating a duplicate account."
              : "Create a new user account and assign their initial role."}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6 px-6 py-6 sm:px-8">
          {globalError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{globalError}</AlertDescription>
            </Alert>
          )}

          {existingUser && (
            <Alert variant="information">
              <Info className="size-4" />
              <AlertDescription>
                You are adding a role to an existing account. Its name, email, and current roles
                stay unchanged.
              </AlertDescription>
            </Alert>
          )}

          {!existingUser && (
            <TextField
              id="name"
              label="Name"
              name="name"
              register={register}
              error={errors.name?.message}
              placeholder="Enter full name"
              helper="Provisional name used until the user links their Google account."
            />
          )}

          <div className={cn("grid grid-cols-1 gap-4", !existingUser && "md:grid-cols-2")}>
            <TextField
              id="email"
              label="Email address"
              type="email"
              name="email"
              register={register}
              error={errors.email?.message}
              helper={emailHelper}
              placeholder="user@example.com"
              onBlur={handleEmailBlur}
            />
            {!existingUser && (
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
            )}
          </div>

          {existingUser && (
            <div className="border-border bg-muted/40 flex flex-col gap-3 rounded-lg border p-4">
              <div className="flex items-start gap-2.5">
                <span className="bg-primary/10 text-primary mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full">
                  <UserCheck className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm font-semibold">{existingUser.name}</p>
                  <p className="text-text-muted truncate text-xs">{existingUser.email}</p>
                </div>
                {!existingUser.isActive && <Badge variant="secondary">Inactive</Badge>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-text-muted text-xs font-medium">Current roles</span>
                {existingUser.roles.length > 0 ? (
                  existingUser.roles.map((role) => (
                    <Badge key={role} className={getRoleBadgeClass(role)}>
                      {formatRole(role)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-text-muted text-xs">No roles assigned</span>
                )}
              </div>
            </div>
          )}

          {existingUser && (
            <SelectField
              id="role"
              label="New role"
              name="role"
              control={control}
              value={selectedRole}
              onChange={(value) => handleRoleChange(value as SystemRole)}
              options={roleOptions}
              placeholder="Select a role to add"
              helper={roleHelper}
              error={errors.role?.message}
            />
          )}

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
            disabled={isSubmitting || everyRoleAssigned}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" data-icon="inline-start" />
                {existingUser ? "Adding role…" : "Creating user…"}
              </>
            ) : existingUser ? (
              <>
                Add role
                <UserPlus data-icon="inline-end" />
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
