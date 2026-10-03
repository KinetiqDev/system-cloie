"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * One labelled entry field with its validation message.
 *
 * Every entry form renders the same label, control, and `role="alert"` error
 * pairing, wired through the field's own id so the error is associated with the
 * control for assistive technology.
 */
export function EntryField({
  id,
  label,
  error,
  control,
}: {
  id: string;
  label: string;
  error?: string;
  control?: InputHTMLAttributes<HTMLInputElement>;
}) {
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...control}
      />
      <FieldError id={errorId} error={error} />
    </div>
  );
}

/** Renders a validation message as a live alert, or nothing when there is none. */
function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} role="alert" className="text-destructive text-sm">
      {error}
    </p>
  );
}

/** Renders an optional control override (password fields) inside a field shell. */
export function EntryFieldShell({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: (describedBy: string | undefined) => ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children(error ? `${id}-error` : undefined)}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}
