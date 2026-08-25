"use client";

import { useState } from "react";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { customZodResolver } from "@/lib/forms/zod-resolver";
import {
  SHOWCASE_DEPARTMENT_OPTIONS,
  SHOWCASE_PLAN_OPTIONS,
  SHOWCASE_ROLE_OPTIONS,
} from "@/features/design-system/data/showcase-fixtures";

const showcaseFormSchema = z.object({
  department: z.string().min(1, "Choose a department."),
  role: z.string().min(1, "Choose a role."),
  plan: z.string().min(1, "Choose a plan."),
  displayName: z.string().min(2, "Enter at least 2 characters."),
  notes: z.string().optional(),
  notify: z.boolean().optional(),
  reminder: z.boolean().optional(),
});

type ShowcaseFormValues = z.infer<typeof showcaseFormSchema>;

export function FormControlsShowcase() {
  const [submittedLabel, setSubmittedLabel] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setError,
  } = useForm<ShowcaseFormValues>({
    resolver: customZodResolver(showcaseFormSchema),
    mode: "onBlur",
    defaultValues: {
      department: "",
      role: "",
      plan: "",
      displayName: "",
      notes: "",
      notify: true,
      reminder: false,
    },
  });

  const departmentLabel = (value: string) =>
    SHOWCASE_DEPARTMENT_OPTIONS.find((option) => option.value === value)?.label ?? value;
  const roleLabel = (value: string) =>
    SHOWCASE_ROLE_OPTIONS.find((option) => option.value === value)?.label ?? value;
  const planLabel = (value: string) =>
    SHOWCASE_PLAN_OPTIONS.find((option) => option.value === value)?.label ?? value;

  const onSubmit: SubmitHandler<ShowcaseFormValues> = (data) => {
    setSubmittedLabel(
      `Submitted: ${roleLabel(data.role)} in ${departmentLabel(data.department)} (${planLabel(data.plan)})`
    );
  };

  const showInvalidState = () => {
    setError("department", { message: "Sample invalid value: pick a department." });
    setError("displayName", { message: "Sample invalid value: 2 characters minimum." });
    setError("role", { message: "Sample invalid value: choose a role." });
    setError("plan", { message: "Sample invalid value: choose a plan." });
  };

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-label="Showcase reference form"
        className="flex flex-col gap-6"
      >
        <FieldSet>
          <FieldLegend className="text-sm">Identity</FieldLegend>

          <Field>
            <FieldLabel htmlFor="showcase-display-name">Display name</FieldLabel>
            <FieldContent>
              <Input
                id="showcase-display-name"
                placeholder="Sample name"
                aria-describedby={
                  errors.displayName ? "showcase-display-name-error" : "showcase-display-name-help"
                }
                aria-invalid={errors.displayName ? true : undefined}
                {...register("displayName")}
              />
              <FieldDescription id="showcase-display-name-help">
                Shown next to your reference sample actions.
              </FieldDescription>
              <FieldError id="showcase-display-name-error" errors={[errors.displayName]} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="showcase-notes">Notes</FieldLabel>
            <FieldContent>
              <Textarea
                id="showcase-notes"
                placeholder="Optional sample notes"
                rows={3}
                {...register("notes")}
              />
              <FieldDescription>Optional free text.</FieldDescription>
            </FieldContent>
          </Field>

          <Field data-invalid={errors.department ? true : undefined}>
            <FieldLabel htmlFor="showcase-department">Department</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="department"
                render={({ field }) => (
                  <Select value={field.value || null} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="showcase-department"
                      className="w-full"
                      aria-invalid={errors.department ? true : undefined}
                      aria-describedby={errors.department ? "showcase-department-error" : undefined}
                    >
                      <SelectValue placeholder="Choose a department" />
                    </SelectTrigger>
                    <SelectContent>
                      {SHOWCASE_DEPARTMENT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError id="showcase-department-error" errors={[errors.department]} />
            </FieldContent>
          </Field>

          <Field data-invalid={errors.role ? true : undefined}>
            <FieldLabel id="showcase-role-label">Role</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <RadioGroup
                    aria-labelledby="showcase-role-label"
                    aria-invalid={errors.role ? true : undefined}
                    aria-describedby={errors.role ? "showcase-role-error" : undefined}
                    value={field.value || ""}
                    onValueChange={field.onChange}
                  >
                    {SHOWCASE_ROLE_OPTIONS.map((option) => (
                      <Label key={option.value} className="gap-2">
                        <RadioGroupItem value={option.value} />
                        {option.label}
                      </Label>
                    ))}
                  </RadioGroup>
                )}
              />
              <FieldError id="showcase-role-error" errors={[errors.role]} />
            </FieldContent>
          </Field>
        </FieldSet>

        <FieldSet>
          <FieldLegend className="text-sm">Plan</FieldLegend>

          <Field orientation="horizontal" data-invalid={errors.plan ? true : undefined}>
            <FieldContent>
              <Controller
                control={control}
                name="plan"
                render={({ field }) => (
                  <Select value={field.value || null} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="showcase-plan"
                      className="w-full"
                      aria-invalid={errors.plan ? true : undefined}
                      aria-describedby={errors.plan ? "showcase-plan-error" : undefined}
                    >
                      <SelectValue placeholder="Choose a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {SHOWCASE_PLAN_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError id="showcase-plan-error" errors={[errors.plan]} />
            </FieldContent>
            <FieldLabel htmlFor="showcase-plan">Plan</FieldLabel>
          </Field>

          <Field orientation="horizontal">
            <FieldContent>
              <Controller
                control={control}
                name="notify"
                render={({ field }) => (
                  <Switch
                    id="showcase-notify"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <FieldDescription>Reference notifications are never sent.</FieldDescription>
            </FieldContent>
            <FieldLabel htmlFor="showcase-notify">Notifications</FieldLabel>
          </Field>

          <Field orientation="horizontal">
            <FieldContent>
              <Controller
                control={control}
                name="reminder"
                render={({ field }) => (
                  <Checkbox
                    id="showcase-reminder"
                    checked={field.value ?? false}
                    onCheckedChange={(value) => field.onChange(Boolean(value))}
                  />
                )}
              />
              <FieldDescription>Reference reminder toggle.</FieldDescription>
            </FieldContent>
            <FieldLabel htmlFor="showcase-reminder">Weekly reminder</FieldLabel>
          </Field>
        </FieldSet>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button type="submit" loading={isSubmitting}>
            Save reference
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset();
              setSubmittedLabel(null);
            }}
          >
            Reset
          </Button>
          <Button type="button" variant="ghost" onClick={showInvalidState}>
            Show invalid state
          </Button>
        </div>

        {submittedLabel ? (
          <p role="status" aria-live="polite" className="text-body-sm text-muted-foreground">
            {submittedLabel}
          </p>
        ) : null}
      </form>
    </div>
  );
}
