"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

export type EntryFormMessage =
  | { kind: "success"; text: string }
  | { kind: "info"; text: string }
  | { kind: "error"; text: string }
  | null;

const MESSAGE_ICONS = {
  success: CheckCircle2,
  info: Info,
  error: AlertCircle,
} as const;

/**
 * Polite live region for entry-form outcomes; never used for status-by-color
 * alone.
 *
 * `info` exists because several entry responses are deliberately conditional —
 * "if this email is eligible, a code is on its way". A success tick beside
 * that copy would assert an outcome the message refuses to promise, and would
 * read differently depending on what the person typed.
 */
export function EntryFormMessageView({ message }: { message: EntryFormMessage }) {
  if (!message) return null;
  const Icon = MESSAGE_ICONS[message.kind];
  return (
    <Alert variant={message.kind === "error" ? "destructive" : "default"} role="status">
      <Icon className="size-4" aria-hidden="true" />
      <AlertDescription>{message.text}</AlertDescription>
    </Alert>
  );
}
