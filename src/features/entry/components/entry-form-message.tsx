"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export type EntryFormMessage =
  | { kind: "success"; text: string }
  | { kind: "error"; text: string }
  | null;

/** Polite live region for entry-form outcomes; never used for status-by-color alone. */
export function EntryFormMessageView({ message }: { message: EntryFormMessage }) {
  if (!message) return null;
  return (
    <Alert variant={message.kind === "error" ? "destructive" : "default"} role="status">
      {message.kind === "error" ? (
        <AlertCircle className="size-4" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="size-4" aria-hidden="true" />
      )}
      <AlertDescription>{message.text}</AlertDescription>
    </Alert>
  );
}
