"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { showToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field";
import { customZodResolver } from "@/lib/forms/zod-resolver";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  createPLOSchema,
  updatePLOSchema,
  type CreatePLOInput,
  type UpdatePLOInput,
} from "../schemas/plo";
import { createPLOAction, updatePLOAction } from "@/lib/actions/program-head-outcome-actions";
import type { ProgramPLOItem } from "../services/manage-program-head-outcomes";

type PLOFormDialogProps =
  | {
      mode: "create";
      programId: string;
      plo?: undefined;
      open: boolean;
      onOpenChange: (open: boolean) => void;
    }
  | {
      mode: "edit";
      programId: string;
      plo: ProgramPLOItem;
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
  } = useForm<CreatePLOInput>({
    resolver: customZodResolver(createPLOSchema),
    defaultValues: { programId, code: "", description: "" },
  });

  function onSubmit(data: CreatePLOInput) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("programId", data.programId);
      formData.set("code", data.code);
      formData.set("description", data.description);
      const result = await createPLOAction(formData);
      if (!result.success) {
        setError("root", { message: result.error });
        showToast(result.error, "error");
        return;
      }
      showToast("Program Learning Outcome created successfully.", "success");
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
        <FieldLabel htmlFor="create-plo-code">PLO Code</FieldLabel>
        <FieldContent>
          <Input
            id="create-plo-code"
            placeholder="e.g. PLO-1"
            autoComplete="off"
            aria-invalid={errors.code ? true : undefined}
            aria-describedby={errors.code ? "create-plo-code-error" : undefined}
            {...register("code")}
          />
          <FieldError id="create-plo-code-error" errors={[errors.code]} />
        </FieldContent>
      </Field>
      <Field data-invalid={errors.description ? true : undefined}>
        <FieldLabel htmlFor="create-plo-description">Description</FieldLabel>
        <FieldContent>
          <Textarea
            id="create-plo-description"
            placeholder="Describe the program learning outcome..."
            rows={4}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? "create-plo-description-error" : undefined}
            {...register("description")}
          />
          <FieldError id="create-plo-description-error" errors={[errors.description]} />
        </FieldContent>
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={isPending}>
          {isPending ? "Saving..." : "Create PLO"}
        </Button>
      </div>
    </form>
  );
}

function EditForm({
  programId,
  plo,
  onClose,
}: {
  programId: string;
  plo: ProgramPLOItem;
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
  } = useForm<UpdatePLOInput>({
    resolver: customZodResolver(updatePLOSchema),
    defaultValues: { programId, id: plo.id, code: plo.code, description: plo.description },
  });

  function onSubmit(data: UpdatePLOInput) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("programId", data.programId);
      formData.set("id", data.id);
      formData.set("code", data.code);
      formData.set("description", data.description);
      const result = await updatePLOAction(formData);
      if (!result.success) {
        setError("root", { message: result.error });
        showToast(result.error, "error");
        return;
      }
      showToast("Program Learning Outcome updated successfully.", "success");
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
        <FieldLabel htmlFor="edit-plo-code">PLO Code</FieldLabel>
        <FieldContent>
          <Input
            id="edit-plo-code"
            placeholder="e.g. PLO-1"
            autoComplete="off"
            aria-invalid={errors.code ? true : undefined}
            aria-describedby={errors.code ? "edit-plo-code-error" : undefined}
            {...register("code")}
          />
          <FieldError id="edit-plo-code-error" errors={[errors.code]} />
        </FieldContent>
      </Field>
      <Field data-invalid={errors.description ? true : undefined}>
        <FieldLabel htmlFor="edit-plo-description">Description</FieldLabel>
        <FieldContent>
          <Textarea
            id="edit-plo-description"
            placeholder="Describe the program learning outcome..."
            rows={4}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? "edit-plo-description-error" : undefined}
            {...register("description")}
          />
          <FieldError id="edit-plo-description-error" errors={[errors.description]} />
        </FieldContent>
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

export function PLOFormDialog({ mode, programId, plo, open, onOpenChange }: PLOFormDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
  }

  const form =
    mode === "create" ? (
      <CreateForm programId={programId} onClose={() => onOpenChange(false)} />
    ) : (
      <EditForm programId={programId} plo={plo} onClose={() => onOpenChange(false)} />
    );

  const title =
    mode === "create" ? "Add Program Learning Outcome" : "Edit Program Learning Outcome";
  const description =
    mode === "create"
      ? "Create a new Program Learning Outcome for your program."
      : "Update Program Learning Outcome details.";

  if (!isDesktop) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange} showSwipeHandle>
        <DrawerContent className="flex max-h-[85dvh] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <DrawerHeader className="shrink-0 px-0 pt-4 pb-2 text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription className="line-clamp-2">{description}</DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pb-2">{form}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
}
