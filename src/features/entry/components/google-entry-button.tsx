"use client";

import { useState } from "react";
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
}: {
  roleTitle: string;
  label: string;
  domainNote: string;
  intent: TicketIntent;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsDialogOpen(true)}
        className="min-h-12 w-full py-3 text-center whitespace-normal shadow-sm"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- third-party
            brand lockup; a static decorative SVG gains nothing from the
            image optimizer and would need width/height plumbing. */}
        <img
          src="/logos/google-logo.svg"
          alt=""
          className="h-4 w-auto shrink-0"
          aria-hidden="true"
        />
        <span className="min-w-0 leading-tight">{label}</span>
      </Button>
      <p className="text-body-sm text-muted-foreground min-w-0 leading-relaxed">{domainNote}</p>

      <LegalAcknowledgementDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        roleTitle={roleTitle}
        intent={intent}
      />
    </div>
  );
}
