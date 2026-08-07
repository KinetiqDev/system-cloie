"use client";

import { useRef, useState, useTransition } from "react";
import { AlertCircle, Plus, Power, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  createMajorAction,
  toggleMajorActiveAction,
  deleteMajorAction,
} from "@/lib/actions/admin-program-actions";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type ManageMajorsDialogProps = {
  program: { id: string; code: string; name: string };
  majors: Array<{ id: string; name: string; is_active: boolean }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ManageMajorsDialog({
  program,
  majors,
  open,
  onOpenChange,
}: ManageMajorsDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleAddMajor(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createMajorAction(formData);
      if (!result.success) {
        setError(result.error);
      } else {
        formRef.current?.reset();
      }
    });
  }

  function handleToggleActive(majorId: string, currentActive: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await toggleMajorActiveAction(majorId, !currentActive);
      if (!result.success) {
        setError(result.error);
      }
    });
  }

  function handleDelete(majorId: string) {
    setError(null);
    setConfirmDeleteId(null);
    startTransition(async () => {
      const result = await deleteMajorAction(majorId);
      if (!result.success) {
        setError(result.error);
      }
    });
  }

  // Shared inner content
  const content = (
    <>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Majors list */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {majors.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No majors yet. Add one below.
          </p>
        ) : (
          <ul className="divide-y">
            {majors.map((major) => (
              <li key={major.id} className="flex items-center justify-between gap-2 py-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate text-sm font-medium">{major.name}</span>
                  <Badge variant={major.is_active ? "success" : "secondary"} className="shrink-0">
                    {major.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={isPending}
                    onClick={() => handleToggleActive(major.id, major.is_active)}
                    title={major.is_active ? "Deactivate" : "Activate"}
                  >
                    <Power className="size-3.5" />
                    <span className="sr-only">{major.is_active ? "Deactivate" : "Activate"}</span>
                  </Button>

                  {confirmDeleteId === major.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleDelete(major.id)}
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={isPending}
                      onClick={() => setConfirmDeleteId(major.id)}
                      title="Delete major"
                    >
                      <Trash2 className="text-destructive size-3.5" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add major form */}
      <form ref={formRef} action={handleAddMajor} className="flex items-center gap-2 border-t pt-4">
        <input type="hidden" name="program_id" value={program.id} />
        <div className="min-w-0 flex-1">
          <Input
            name="name"
            placeholder="New major name..."
            required
            maxLength={200}
            disabled={isPending}
            className="w-full"
          />
        </div>
        <Button type="submit" size="default" disabled={isPending} className="shrink-0">
          <Plus className="size-4" data-icon="inline-start" />
          {isPending ? "Adding..." : "Add"}
        </Button>
      </form>
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[min(90dvh,36rem)] flex-col sm:max-w-md">
          <DialogHeader className="shrink-0">
            <DialogTitle>Manage Majors — {program.code}</DialogTitle>
            <DialogDescription>Add, toggle, or remove majors for {program.name}.</DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">{content}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent className="flex max-h-[85dvh] flex-col px-4 pb-8">
        <DrawerHeader className="shrink-0 px-0 pt-4 pb-2 text-left">
          <DrawerTitle>Manage Majors — {program.code}</DrawerTitle>
          <DrawerDescription className="line-clamp-2">
            Add, toggle, or remove majors for {program.name}.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden pb-2">{content}</div>
      </DrawerContent>
    </Drawer>
  );
}
