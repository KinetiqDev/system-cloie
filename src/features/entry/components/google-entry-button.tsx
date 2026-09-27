"use client";

import { useState } from "react";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LegalAcknowledgementDialog } from "@/features/legal/components/legal-acknowledgement-dialog";
import type { TicketIntent } from "@/features/auth/services/role-intent";

/**
 * Single ACD/Google entry action for the scoped public entrances.
 *
 * Opens the legal acknowledgement dialog first; the acknowledgement ticket
 * (entrance-bound intent plus pinned privacy/terms versions) is issued before
 * any Google contact, and the OAuth callback verifies it before the code
 * exchange. `intent` is a TicketIntent: a role intent (`student`, `faculty`,
 * `alumni`, `industry-partner`) or a role-less entry intent (`staff`,
 * `external`) that the callback resolves without claiming a role.
 */
export function GoogleEntryButton({
  intent,
  roleTitle,
  label,
  domainNote,
  googleAllowed = true,
}: {
  intent: TicketIntent;
  roleTitle: string;
  label: string;
  domainNote: string;
  googleAllowed?: boolean;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="border-border/50 bg-background text-caption text-muted-foreground flex items-start gap-2 rounded-lg border p-3">
        {googleAllowed ? (
          <>
            <CheckCircle2 className="text-success size-4 shrink-0" aria-hidden="true" />
            <span>{domainNote}</span>
          </>
        ) : (
          <>
            <ShieldAlert className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{domainNote}</span>
          </>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => setIsDialogOpen(true)}
        className="min-h-12 w-full py-3 text-center whitespace-normal shadow-sm"
      >
        <img
          src="/logos/google-logo.svg"
          alt=""
          className="h-4 w-auto shrink-0"
          aria-hidden="true"
        />
        <span className="min-w-0 leading-tight">{label}</span>
      </Button>

      <LegalAcknowledgementDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        roleTitle={roleTitle}
        intent={intent}
      />
    </div>
  );
}
