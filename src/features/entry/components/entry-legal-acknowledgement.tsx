"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LEGAL_ACKNOWLEDGEMENT_CONTENT } from "@/features/legal/acknowledgement-content";
import { LEGAL_VERSIONS } from "@/features/legal/legal-versions";
import type { TicketIntent } from "@/features/auth/services/role-intent";

/**
 * Inline legal acknowledgement for the email-first entry flows (issue #649).
 *
 * The gated Server Actions (sign-in, registration, verification, recovery,
 * Faculty requests) verify the ticket server-side before any mutation, and
 * the ticket cookie travels with page-URL action POSTs — so the email path
 * must acknowledge the same entrance before submitting, just as the Google
 * buttons do through the dialog. `acknowledgeEntryLegal` issues (or refreshes)
 * the ticket; callers abort their submit when it returns false.
 */
export async function acknowledgeEntryLegal(intent: TicketIntent): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/legal-acknowledgement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent,
        privacyVersion: LEGAL_VERSIONS.privacy,
        termsVersion: LEGAL_VERSIONS.terms,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export const ENTRY_LEGAL_REQUIRED_MESSAGE =
  "Accept the Privacy Notice and Terms of Use to continue.";

export function EntryLegalCheckbox({
  checked,
  onCheckedChange,
  id,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id: string;
}) {
  return (
    <div className="border-border bg-muted/40 flex w-full min-w-0 items-start gap-3 rounded-lg border p-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        aria-required="true"
      />
      <div className="min-w-0 space-y-1.5">
        <Label htmlFor={id} className="block min-w-0 cursor-pointer text-sm leading-relaxed">
          {LEGAL_ACKNOWLEDGEMENT_CONTENT.acknowledgementLabel}
        </Label>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link
            href="/privacy"
            className="text-link inline-flex min-h-11 items-center font-medium underline underline-offset-4"
          >
            Privacy Notice
          </Link>
          <Link
            href="/terms"
            className="text-link inline-flex min-h-11 items-center font-medium underline underline-offset-4"
          >
            Terms of Use
          </Link>
        </div>
      </div>
    </div>
  );
}
