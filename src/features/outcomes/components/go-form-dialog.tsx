"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field";
import { showToast } from "@/components/ui/toast";
import { customZodResolver } from "@/lib/forms/zod-resolver";
import {
  createGOSchema,
  updateGOSchema,
  type CreateGOInput,
  type UpdateGOInput,
} from "../schemas/go";
import { createGOAction, updateGOAction } from "@/lib/actions/program-head-outcome-actions";
import type { ProgramGOItem } from "../services/manage-program-head-outcomes";

type GOFormDialogProps =
  | {
      mode: "create";
      programId: string;
      go?: undefined;
      open: boolean;
      onOpenChange: (open: boolean) => void;
    }
  | {
      mode: "edit";
      programId: string;
      go: ProgramGOItem;
      open: boolean;
      onOpenChange: (open: boolean) => void;
    };

function CreateForm({ programId, onClose }: { programId: string; onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<CreateGOInput>({
    resolver: customZodResolver(createGOSchema),
    defaultValues: { programId, code: "", description: "" },
  });

  function onSubmit(data: CreateGOInput) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("programId", data.programId);
      formData.set("code", data.code);
      formData.set("description", data.description);
      const result = await createGOAction(formData);
      if (!result.success) {
        setError("root", { message: result.error });
        showToast(result.error, "error");
        return;
      }
      showToast("Graduate Outcome created successfully.", "success");
      reset();
      onClose();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {errors.root && (
        <Alert variant="destructive">
          <AlertDescription>{errors.root.message}</AlertDescription>
        </Alert>
      )}
      <Field data-invalid={errors.code ? true : undefined}>
        <FieldLabel htmlFor="create-go-code">GO Code</FieldLabel>
        <FieldContent>
          <Input
            id="create-go-code"
            placeholder="e.g. GO-1"
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
            placeholder="Describe the Graduate Outcome..."
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
          {isPending ? "Saving..." : "Create GO"}
        </Button>
      </div>
    </form>
  );
}

function EditForm({
  programId,
  go,
  onClose,
}: {
  programId: string;
  go: ProgramGOItem;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<UpdateGOInput>({
    resolver: customZodResolver(updateGOSchema),
    defaultValues: { programId, id: go.id, code: go.code, description: go.description },
  });

  function onSubmit(data: UpdateGOInput) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("programId", data.programId);
      formData.set("id", data.id);
      formData.set("code", data.code);
      formData.set("description", data.description);
      const result = await updateGOAction(formData);
      if (!result.success) {
        setError("root", { message: result.error });
        showToast(result.error, "error");
        return;
      }
      showToast("Graduate Outcome updated successfully.", "success");
      reset();
      onClose();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("programId")} />
      <input type="hidden" {...register("id")} />
      {errors.root && (
        <Alert variant="destructive">
          <AlertDescription>{errors.root.message}</AlertDescription>
        </Alert>
      )}
      <Field data-invalid={errors.code ? true : undefined}>
        <FieldLabel htmlFor="edit-go-code">GO Code</FieldLabel>
        <FieldContent>
          <Input
            id="edit-go-code"
            placeholder="e.g. GO-1"
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
            placeholder="Describe the Graduate Outcome..."
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

export function GOFormDialog({ mode, programId, go, open, onOpenChange }: GOFormDialogProps) {
  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent desktopClassName="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {mode === "create" ? "Add Graduate Outcome" : "Edit Graduate Outcome"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {mode === "create"
              ? "Create a Graduate Outcome for your program."
              : "Update Graduate Outcome details."}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-0">
          {mode === "create" ? (
            <CreateForm programId={programId} onClose={() => onOpenChange(false)} />
          ) : (
            <EditForm programId={programId} go={go} onClose={() => onOpenChange(false)} />
          )}
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
