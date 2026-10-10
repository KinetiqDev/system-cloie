"use client";

import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
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
      {errors.root && (
        <Alert variant="destructive">
          <AlertDescription>{errors.root.message}</AlertDescription>
        </Alert>
      )}
      <Field data-invalid={!!errors.classification}>
        <FieldLabel htmlFor="create-po-classification">Classification</FieldLabel>
        <Controller
          name="classification"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? null} onValueChange={(value) => field.onChange(value)}>
              <SelectTrigger
                id="create-po-classification"
                className="w-full"
                onBlur={field.onBlur}
                ref={field.ref}
                aria-invalid={!!errors.classification}
              >
                <SelectValue placeholder="Select a classification" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="CORE">Core</SelectItem>
                  <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.classification]} />
      </Field>
      <Field data-invalid={errors.code ? true : undefined}>
        <FieldLabel htmlFor="create-go-code">PO Code</FieldLabel>
        <FieldContent>
          <Input
            id="create-go-code"
            placeholder="e.g. PO-1"
            autoComplete="off"
            aria-invalid={errors.code ? true : undefined}
            aria-describedby={errors.code ? "create-go-code-error" : undefined}
            {...register("code")}
          />
          <FieldError id="create-go-code-error" errors={[errors.code]} />
        </FieldContent>
      </Field>
      <Field data-invalid={errors.description ? true : undefined}>
        <FieldLabel htmlFor="create-go-description">Description</FieldLabel>
        <FieldContent>
          <Textarea
            id="create-go-description"
            placeholder="Describe the Program Outcome..."
            rows={4}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? "create-go-description-error" : undefined}
            {...register("description")}
          />
          <FieldError id="create-go-description-error" errors={[errors.description]} />
        </FieldContent>
      </Field>
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
          {isPending ? "Saving..." : "Create PO"}
        </Button>
      </div>
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
      classification:
        po.classification === "CORE" || po.classification === "PROFESSIONAL"
          ? po.classification
          : undefined,
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
      {errors.root && (
        <Alert variant="destructive">
          <AlertDescription>{errors.root.message}</AlertDescription>
        </Alert>
      )}
      <Field data-invalid={!!errors.classification}>
        <FieldLabel htmlFor="edit-po-classification">Classification</FieldLabel>
        <Controller
          name="classification"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? null} onValueChange={(value) => field.onChange(value)}>
              <SelectTrigger
                id="edit-po-classification"
                className="w-full"
                onBlur={field.onBlur}
                ref={field.ref}
                aria-invalid={!!errors.classification}
              >
                <SelectValue placeholder="Select a classification" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="CORE">Core</SelectItem>
                  <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.classification]} />
      </Field>
      <Field data-invalid={errors.code ? true : undefined}>
        <FieldLabel htmlFor="edit-go-code">PO Code</FieldLabel>
        <FieldContent>
          <Input
            id="edit-go-code"
            placeholder="e.g. PO-1"
            autoComplete="off"
            aria-invalid={errors.code ? true : undefined}
            aria-describedby={errors.code ? "edit-go-code-error" : undefined}
            {...register("code")}
          />
          <FieldError id="edit-go-code-error" errors={[errors.code]} />
        </FieldContent>
      </Field>
      <Field data-invalid={errors.description ? true : undefined}>
        <FieldLabel htmlFor="edit-go-description">Description</FieldLabel>
        <FieldContent>
          <Textarea
            id="edit-go-description"
            placeholder="Describe the Program Outcome..."
            rows={4}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? "edit-go-description-error" : undefined}
            {...register("description")}
          />
          <FieldError id="edit-go-description-error" errors={[errors.description]} />
        </FieldContent>
      </Field>
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
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
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
