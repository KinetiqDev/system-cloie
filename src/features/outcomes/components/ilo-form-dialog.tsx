// fallow-ignore-next-line code-duplication
"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field";
import { useMediaQuery } from "@/hooks/use-media-query";
import { customZodResolver } from "@/lib/forms/zod-resolver";
import type { InstitutionalOutcomeItem } from "../services/manage-gen-ed-outcomes";
import {
  createILOSchema,
  updateILOSchema,
  type CreateILOInput,
  type UpdateILOInput,
} from "../schemas/ilo";
import { createILOAction, updateILOAction } from "@/lib/actions/gen-ed-outcome-actions";

type ILOFormDialogProps =
  | {
      mode: "create";
      ilo?: undefined;
      open: boolean;
      onOpenChange: (open: boolean) => void;
    }
  | {
      mode: "edit";
      ilo: InstitutionalOutcomeItem;
      open: boolean;
      onOpenChange: (open: boolean) => void;
    };

// fallow-ignore-next-line code-duplication
// fallow-ignore-next-line complexity
function CreateForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<CreateILOInput>({
    resolver: customZodResolver(createILOSchema),
    defaultValues: { code: "", description: "" },
  });

  function onSubmit(data: CreateILOInput) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("code", data.code);
      // fallow-ignore-next-line code-duplication
      formData.set("description", data.description);
      // fallow-ignore-next-line code-duplication
      const result = await createILOAction(formData);
      if (!result.success) {
        setError("root", { message: result.error });
        return;
      }
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
        <FieldLabel htmlFor="create-ilo-code">ILO Code</FieldLabel>
        <FieldContent>
          <Input
            id="create-ilo-code"
            placeholder="e.g. ILO-1"
            autoComplete="off"
            aria-invalid={errors.code ? true : undefined}
            aria-describedby={errors.code ? "create-ilo-code-error" : undefined}
            {...register("code")}
          />
          <FieldError id="create-ilo-code-error" errors={[errors.code]} />
        </FieldContent>
      </Field>
      <Field data-invalid={errors.description ? true : undefined}>
        <FieldLabel htmlFor="create-ilo-description">Description</FieldLabel>
        <FieldContent>
          <Textarea
            id="create-ilo-description"
            placeholder="Describe the institutional learning outcome..."
            rows={4}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? "create-ilo-description-error" : undefined}
            {...register("description")}
          />
          <FieldError id="create-ilo-description-error" errors={[errors.description]} />
        </FieldContent>
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={isPending}>
          {isPending ? "Saving..." : "Create ILO"}
        </Button>
      </div>
    </form>
  );
}

// fallow-ignore-next-line code-duplication
// fallow-ignore-next-line complexity
function EditForm({ ilo, onClose }: { ilo: InstitutionalOutcomeItem; onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<UpdateILOInput>({
    resolver: customZodResolver(updateILOSchema),
    defaultValues: { id: ilo.id, code: ilo.code, description: ilo.description },
  });

  function onSubmit(data: UpdateILOInput) {
    startTransition(async () => {
      const formData = new FormData();
      // fallow-ignore-next-line code-duplication
      formData.set("id", data.id);
      formData.set("code", data.code);
      formData.set("description", data.description);
      // fallow-ignore-next-line code-duplication
      const result = await updateILOAction(formData);
      if (!result.success) {
        setError("root", { message: result.error });
        return;
      }
      reset();
      onClose();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("id")} />
      {errors.root && (
        <Alert variant="destructive">
          <AlertDescription>{errors.root.message}</AlertDescription>
        </Alert>
      )}
      <Field data-invalid={errors.code ? true : undefined}>
        <FieldLabel htmlFor="edit-ilo-code">ILO Code</FieldLabel>
        <FieldContent>
          <Input
            id="edit-ilo-code"
            placeholder="e.g. ILO-1"
            autoComplete="off"
            aria-invalid={errors.code ? true : undefined}
            aria-describedby={errors.code ? "edit-ilo-code-error" : undefined}
            {...register("code")}
          />
          <FieldError id="edit-ilo-code-error" errors={[errors.code]} />
        </FieldContent>
      </Field>
      <Field data-invalid={errors.description ? true : undefined}>
        <FieldLabel htmlFor="edit-ilo-description">Description</FieldLabel>
        <FieldContent>
          <Textarea
            id="edit-ilo-description"
            placeholder="Describe the institutional learning outcome..."
            rows={4}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? "edit-ilo-description-error" : undefined}
            {...register("description")}
          />
          <FieldError id="edit-ilo-description-error" errors={[errors.description]} />
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

// fallow-ignore-next-line code-duplication
export function ILOFormDialog(props: ILOFormDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  function handleOpenChange(nextOpen: boolean) {
    props.onOpenChange(nextOpen);
  }

  const form =
    props.mode === "create" ? (
      <CreateForm onClose={() => props.onOpenChange(false)} />
    ) : (
      <EditForm ilo={props.ilo} onClose={() => props.onOpenChange(false)} />
    );

  const title =
    props.mode === "create"
      ? "Add Institutional Learning Outcome"
      : "Edit Institutional Learning Outcome";
  const description =
    props.mode === "create"
      ? "Create a new Institutional Learning Outcome in the college-wide catalog."
      : "Update Institutional Learning Outcome details.";

  if (!isDesktop) {
    return (
      <Drawer open={props.open} onOpenChange={handleOpenChange} showSwipeHandle>
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
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
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
