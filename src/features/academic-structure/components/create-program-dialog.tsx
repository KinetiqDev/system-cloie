"use client";

import { useState } from "react";
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
import { createProgramAction } from "@/lib/actions/admin-program-actions";
import { ProgramForm } from "./program-form";

const FORM_ID = "create-program-form";

type CreateProgramDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateProgramDialog({ open, onOpenChange }: CreateProgramDialogProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent desktopClassName="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Create Program</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Add a new academic program to the college. You can add majors after creation.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="px-4 py-4 md:p-0">
          <ProgramForm
            action={createProgramAction}
            submitLabel="Create Program"
            formId={FORM_ID}
            onPendingChange={setPending}
            onSuccess={() => {
              onOpenChange(false);
              router.refresh();
            }}
          />
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button form={FORM_ID} type="submit" disabled={pending}>
            {pending ? "Creating..." : "Create Program"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
