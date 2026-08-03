"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
        <div className="bg-danger-soft text-danger rounded-md p-3 text-sm">
          {errors.root.message}
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="create-go-code">GO Code</Label>
        <Input
          id="create-go-code"
          placeholder="e.g. GO-1"
          autoComplete="off"
          aria-invalid={!!errors.code}
          {...register("code")}
        />
        {errors.code && <p className="text-danger text-xs">{errors.code.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="create-go-description">Description</Label>
        <Textarea
          id="create-go-description"
          placeholder="Describe the graduate outcome..."
          rows={4}
          aria-invalid={!!errors.description}
          {...register("description")}
        />
        {errors.description && <p className="text-danger text-xs">{errors.description.message}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
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
        return;
      }
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
        <div className="bg-danger-soft text-danger rounded-md p-3 text-sm">
          {errors.root.message}
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="edit-go-code">GO Code</Label>
        <Input
          id="edit-go-code"
          placeholder="e.g. GO-1"
          autoComplete="off"
          aria-invalid={!!errors.code}
          {...register("code")}
        />
        {errors.code && <p className="text-danger text-xs">{errors.code.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-go-description">Description</Label>
        <Textarea
          id="edit-go-description"
          placeholder="Describe the graduate outcome..."
          rows={4}
          aria-invalid={!!errors.description}
          {...register("description")}
        />
        {errors.description && <p className="text-danger text-xs">{errors.description.message}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Graduate Outcome" : "Edit Graduate Outcome"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new Graduate Outcome for your program."
              : "Update Graduate Outcome details."}
          </DialogDescription>
        </DialogHeader>
        {mode === "create" ? (
          <CreateForm programId={programId} onClose={() => onOpenChange(false)} />
        ) : (
          <EditForm programId={programId} go={go} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
