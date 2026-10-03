"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { updateProgramAction } from "@/lib/actions/admin-program-actions";
import { ProgramForm } from "./program-form";

const FORM_ID = "edit-program-form";

type EditProgramDialogProps = {
  program: { id: string; code: string; name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditProgramDialog({ program, open, onOpenChange }: EditProgramDialogProps) {
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

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent desktopClassName="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Edit Program</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {displayProgram
              ? `Update the program code or name for ${displayProgram.code}.`
              : "Update the program code or name."}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          {displayProgram && (
            <ProgramForm
              key={displayProgram.id}
              action={updateProgramAction}
              defaultValues={{
                id: displayProgram.id,
                code: displayProgram.code,
                name: displayProgram.name,
              }}
              submitLabel="Update Program"
              formId={FORM_ID}
              onPendingChange={setPending}
              onSuccess={() => {
                onOpenChange(false);
                router.refresh();
              }}
            />
          )}
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button form={FORM_ID} type="submit" disabled={pending}>
            {pending ? "Updating..." : "Update Program"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
