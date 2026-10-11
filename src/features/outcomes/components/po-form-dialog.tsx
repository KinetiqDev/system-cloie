"use client";

import { useTransition } from "react";
import { Controller, useForm, type RefCallBack, type UseFormRegisterReturn } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field";
import { showToast } from "@/components/ui/toast";
import { customZodResolver } from "@/lib/forms/zod-resolver";
import {
  createPOSchema,
  updatePOSchema,
  type CreatePOInput,
  type UpdatePOInput,
} from "../schemas/po";
import { createPOAction, updatePOAction } from "@/lib/actions/program-head-outcome-actions";
import { isProgramHeadCategory } from "../po-classification";
import type { ProgramPOItem } from "../services/manage-program-head-outcomes";

type POFormDialogProps =
  | {
      mode: "create";
      programId: string;
      po?: undefined;
      open: boolean;
      onOpenChange: (open: boolean) => void;
    }
  | {
      mode: "edit";
      programId: string;
      po: ProgramPOItem;
      open: boolean;
      onOpenChange: (open: boolean) => void;
    };

/**
 * A Program Head may only set a Core or Professional classification. The two
 * administrative categories — Common and Institution-specific — are owned by
 * the central catalog, so this form never offers them and never pre-selects
 * one: an administrative PO arriving here prefills with no selection at all,
 * and the schema still refuses to submit until a permitted value is chosen.
 */
const PROGRAM_HEAD_CLASSIFICATIONS = [
  { value: "CORE", label: "Core" },
  { value: "PROFESSIONAL", label: "Professional" },
] as const;

/** Server-action failure banner, shared by both form modes. */
function FormRootError({ error }: { error?: { message?: string } }) {
  if (!error) {
    return null;
  }
  return (
    <Alert variant="destructive">
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  );
}

function POClassificationField({
  idPrefix,
  value,
  onValueChange,
  onBlur,
  triggerRef,
  error,
}: {
  idPrefix: "create" | "edit";
  value: string | undefined;
  onValueChange: (value: string | null) => void;
  onBlur: () => void;
  triggerRef: RefCallBack;
  error?: { message?: string };
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={`${idPrefix}-po-classification`}>Classification</FieldLabel>
      <Select value={value ?? null} onValueChange={onValueChange}>
        <SelectTrigger
          id={`${idPrefix}-po-classification`}
          className="w-full"
          onBlur={onBlur}
          ref={triggerRef}
          aria-invalid={!!error}
        >
          <SelectValue placeholder="Select a classification" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {PROGRAM_HEAD_CLASSIFICATIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldError errors={[error]} />
    </Field>
  );
}

function POCodeField({
  idPrefix,
  registration,
  error,
}: {
  idPrefix: "create" | "edit";
  registration: UseFormRegisterReturn;
  error?: { message?: string };
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={`${idPrefix}-go-code`}>PO Code</FieldLabel>
      <FieldContent>
        <Input
          id={`${idPrefix}-go-code`}
          placeholder="e.g. PO-1"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${idPrefix}-go-code-error` : undefined}
          {...registration}
        />
        <FieldError id={`${idPrefix}-go-code-error`} errors={[error]} />
      </FieldContent>
    </Field>
  );
}

function PODescriptionField({
  idPrefix,
  registration,
  error,
}: {
  idPrefix: "create" | "edit";
  registration: UseFormRegisterReturn;
  error?: { message?: string };
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={`${idPrefix}-go-description`}>Description</FieldLabel>
      <FieldContent>
        <Textarea
          id={`${idPrefix}-go-description`}
          placeholder="Describe the Program Outcome..."
          rows={4}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${idPrefix}-go-description-error` : undefined}
          {...registration}
        />
        <FieldError id={`${idPrefix}-go-description-error`} errors={[error]} />
      </FieldContent>
    </Field>
  );
}

function POSubmitActions({
  isPending,
  onClose,
  submitLabel,
}: {
  isPending: boolean;
  onClose: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-2 md:flex-row md:justify-end">
      <Button
        type="button"
        variant="outline"
        className="w-full md:w-auto"
        onClick={onClose}
        disabled={isPending}
      >
        Cancel
      </Button>
      <Button type="submit" className="w-full md:w-auto" loading={isPending}>
        {isPending ? "Saving..." : submitLabel}
      </Button>
    </div>
  );
}

function CreateForm({ programId, onClose }: { programId: string; onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<CreatePOInput>({
    resolver: customZodResolver(createPOSchema),
    defaultValues: { programId, code: "", description: "" },
  });

  function onSubmit(data: CreatePOInput) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("programId", data.programId);
      formData.set("code", data.code);
      formData.set("description", data.description);
      formData.set("classification", data.classification);
      const result = await createPOAction(formData);
      if (!result.success) {
        setError("root", { message: result.error });
        showToast(result.error, "error");
        return;
      }
      showToast("Program Outcome created successfully.", "success");
      reset();
      onClose();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FormRootError error={errors.root} />
      <Controller
        name="classification"
        control={control}
        render={({ field }) => (
          <POClassificationField
            idPrefix="create"
            value={field.value}
            onValueChange={(value) => field.onChange(value)}
            onBlur={field.onBlur}
            triggerRef={field.ref}
            error={errors.classification}
          />
        )}
      />
      <POCodeField idPrefix="create" registration={register("code")} error={errors.code} />
      <PODescriptionField
        idPrefix="create"
        registration={register("description")}
        error={errors.description}
      />
      <POSubmitActions isPending={isPending} onClose={onClose} submitLabel="Create PO" />
    </form>
  );
}

function EditForm({
  programId,
  po,
  onClose,
}: {
  programId: string;
  po: ProgramPOItem;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<UpdatePOInput>({
    resolver: customZodResolver(updatePOSchema),
    defaultValues: {
      programId,
      id: po.id,
      code: po.code,
      description: po.description,
      classification: isProgramHeadCategory(po.classification) ? po.classification : undefined,
    },
  });

  function onSubmit(data: UpdatePOInput) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("programId", data.programId);
      formData.set("id", data.id);
      formData.set("code", data.code);
      formData.set("description", data.description);
      formData.set("classification", data.classification);
      const result = await updatePOAction(formData);
      if (!result.success) {
        setError("root", { message: result.error });
        showToast(result.error, "error");
        return;
      }
      showToast("Program Outcome updated successfully.", "success");
      reset();
      onClose();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <input type="hidden" {...register("programId")} />
      <input type="hidden" {...register("id")} />
      <FormRootError error={errors.root} />
      <Controller
        name="classification"
        control={control}
        render={({ field }) => (
          <POClassificationField
            idPrefix="edit"
            value={field.value}
            onValueChange={(value) => field.onChange(value)}
            onBlur={field.onBlur}
            triggerRef={field.ref}
            error={errors.classification}
          />
        )}
      />
      <POCodeField idPrefix="edit" registration={register("code")} error={errors.code} />
      <PODescriptionField
        idPrefix="edit"
        registration={register("description")}
        error={errors.description}
      />
      <POSubmitActions isPending={isPending} onClose={onClose} submitLabel="Save Changes" />
    </form>
  );
}

export function POFormDialog({ mode, programId, po, open, onOpenChange }: POFormDialogProps) {
  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent desktopClassName="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {mode === "create" ? "Add Program Outcome" : "Edit Program Outcome"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {mode === "create"
              ? "Create a Program Outcome for your program."
              : "Update Program Outcome details."}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="pb-[max(1rem,env(safe-area-inset-bottom))]">
          {mode === "create" ? (
            <CreateForm programId={programId} onClose={() => onOpenChange(false)} />
          ) : (
            <EditForm programId={programId} po={po} onClose={() => onOpenChange(false)} />
          )}
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
