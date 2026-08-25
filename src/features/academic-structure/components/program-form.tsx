"use client";

import { useRef, useState, useTransition } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { showToast } from "@/components/ui/toast";

type ProgramFormProps = {
  action: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  defaultValues?: {
    id?: string;
    code?: string;
    name?: string;
    description?: string | null;
  };
  submitLabel?: string;
  onSuccess?: () => void;
};

// One compact create/edit form keeps submission feedback and field defaults in one tested surface.
// fallow-ignore-next-line complexity
export function ProgramForm({
  action,
  defaultValues,
  submitLabel = "Save Program",
  onSuccess,
}: ProgramFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    // Submission branches map the server action result directly to error or success feedback.
    // fallow-ignore-next-line complexity
    startTransition(async () => {
      const result = await action(formData);
      if (!result.success && result.error) {
        setError(result.error);
      } else if (result.success) {
        formRef.current?.reset();
        showToast(defaultValues?.id ? "Program updated." : "Program created.");
        onSuccess?.();
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="code">Program Code</Label>
          <Input
            id="code"
            name="code"
            placeholder="e.g. BSIT"
            defaultValue={defaultValues?.code}
            required
            maxLength={20}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Program Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="e.g. Bachelor of Science in Information Technology"
            defaultValue={defaultValues?.name}
            required
            maxLength={200}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Program description, accreditation notes..."
          defaultValue={defaultValues?.description ?? ""}
          maxLength={1000}
          rows={3}
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
