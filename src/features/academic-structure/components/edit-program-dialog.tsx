"use client";

import { useEffect, useState } from "react";
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
import { updateProgramAction } from "@/lib/actions/admin-program-actions";
import { ProgramForm } from "./program-form";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type EditProgramDialogProps = {
  program: { id: string; code: string; name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EditProgramDialog({ program, open, onOpenChange }: EditProgramDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [activeProgram, setActiveProgram] = useState(program);

  // Keep the last opened program so the closing animation still has content,
  // and remount the form per program so uncontrolled defaults stay correct.
  useEffect(() => {
    if (program) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveProgram(program);
    }
  }, [program]);

  const displayProgram = program ?? activeProgram;

  const header = (
    <>
      <DialogTitle>Edit Program</DialogTitle>
      <DialogDescription>
        {displayProgram
          ? `Update the program code or name for ${displayProgram.code}.`
          : "Update the program code or name."}
      </DialogDescription>
    </>
  );

  const body = displayProgram ? (
    <ProgramForm
      key={displayProgram.id}
      action={updateProgramAction}
      defaultValues={{
        id: displayProgram.id,
        code: displayProgram.code,
        name: displayProgram.name,
      }}
      submitLabel="Update Program"
      formId="edit-program-form"
      onPendingChange={setPending}
      onSuccess={() => {
        onOpenChange(false);
        router.refresh();
      }}
    />
  ) : null;

  const footer = (
    <div
      className={cn(
        "bg-muted/50 flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end",
        isDesktop ? "rounded-b-xl" : "pb-[max(1rem,env(safe-area-inset-bottom))]"
      )}
    >
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button form="edit-program-form" type="submit" disabled={pending}>
        {pending ? "Updating..." : "Update Program"}
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
          <DrawerTitle>Edit Program</DrawerTitle>
          <DrawerDescription className="line-clamp-2">
            {displayProgram
              ? `Update the program code or name for ${displayProgram.code}.`
              : "Update the program code or name."}
          </DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{body}</div>
        {footer}
      </DrawerContent>
    </Drawer>
  );
}
