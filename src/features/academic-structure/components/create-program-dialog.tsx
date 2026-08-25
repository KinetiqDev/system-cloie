"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { createProgramAction } from "@/lib/actions/admin-program-actions";
import { ProgramForm } from "./program-form";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type CreateProgramDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreateProgramDialog({ open, onOpenChange }: CreateProgramDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const header = (
    <>
      <DialogTitle>Create Program</DialogTitle>
      <DialogDescription>
        Add a new academic program to the college. You can add majors after creation.
      </DialogDescription>
    </>
  );

  const body = (
    <ProgramForm
      action={createProgramAction}
      submitLabel="Create Program"
      formId="create-program-form"
      onPendingChange={setPending}
      onSuccess={() => {
        onOpenChange(false);
        router.refresh();
      }}
    />
  );

  const footer = (
    <div
      className={cn(
        "bg-muted/50 flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end",
        isDesktop
          ? "rounded-b-xl"
          : "pb-[max(1rem,env(safe-area-inset-bottom))]"
      )}
    >
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button form="create-program-form" type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create Program"}
      </Button>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[min(90dvh,36rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="px-5 pt-5 pr-12 pb-1">{header}</DialogHeader>
          <div className="min-h-0 overflow-y-auto px-5 py-4">{body}</div>
          {footer}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent className="flex max-h-[85dvh] flex-col overflow-hidden">
        <DrawerHeader className="shrink-0 px-4 pt-4 pb-2 text-left">
          <DrawerTitle>Create Program</DrawerTitle>
          <DrawerDescription className="line-clamp-2">
            Add a new academic program to the college. You can add majors after creation.
          </DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{body}</div>
        {footer}
      </DrawerContent>
    </Drawer>
  );
}
