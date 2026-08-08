"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/utils/site-url";
import { LEGAL_ACKNOWLEDGEMENT_CONTENT } from "../acknowledgement-content";
import { LEGAL_VERSIONS } from "../legal-versions";
import type { RoleIntent } from "@/features/auth/services/role-intent";

type LegalAcknowledgementDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleTitle: string;
  intent: RoleIntent;
};

export function LegalAcknowledgementDialog({
  open,
  onOpenChange,
  roleTitle,
  intent,
}: LegalAcknowledgementDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setAcknowledged(false);
      setIsSubmitting(false);
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleContinue = async () => {
    if (!acknowledged || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

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
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(result?.error || "Unable to confirm the legal documents. Try again.");
      }

      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${getSiteUrl()}/api/auth/callback?intent=${encodeURIComponent(intent)}`,
        },
      });
      if (oauthError) throw new Error(oauthError.message);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to start Google sign-in. Try again."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="h-[min(760px,calc(100vh-2rem))] min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Before you continue as {roleTitle}</DialogTitle>
          <DialogDescription>
            Review these short summaries before System CLOIE redirects you to Google sign-in.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto pr-1">
          <div className="text-text-secondary flex flex-col gap-5 text-sm leading-6">
            <section aria-labelledby="privacy-summary-heading">
              <h2 id="privacy-summary-heading" className="text-text-primary font-semibold">
                {LEGAL_ACKNOWLEDGEMENT_CONTENT.privacy.shortTitle}
              </h2>
              {LEGAL_ACKNOWLEDGEMENT_CONTENT.privacy.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-2">
                  {paragraph}
                </p>
              ))}
              <Link
                href="/privacy"
                className="text-link focus-visible:ring-ring mt-2 inline-block font-medium underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
              >
                Read the full Privacy Notice
              </Link>
            </section>

            <section aria-labelledby="terms-summary-heading">
              <h2 id="terms-summary-heading" className="text-text-primary font-semibold">
                {LEGAL_ACKNOWLEDGEMENT_CONTENT.terms.shortTitle}
              </h2>
              {LEGAL_ACKNOWLEDGEMENT_CONTENT.terms.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-2">
                  {paragraph}
                </p>
              ))}
              <Link
                href="/terms"
                className="text-link focus-visible:ring-ring mt-2 inline-block font-medium underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
              >
                Read the full Terms of Use
              </Link>
            </section>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter className="-mx-4 -mb-4 flex-col items-stretch gap-3 sm:flex-col">
          <div className="border-border bg-muted/40 flex w-full min-w-0 items-start gap-3 rounded-lg border p-3">
            <Checkbox
              id="legal-acknowledgement"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
              disabled={isSubmitting}
              aria-required="true"
            />
            <Label htmlFor="legal-acknowledgement" className="cursor-pointer text-sm leading-6">
              {LEGAL_ACKNOWLEDGEMENT_CONTENT.acknowledgementLabel}
            </Label>
          </div>
          <div className="flex w-full shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleContinue} disabled={!acknowledged || isSubmitting}>
              {isSubmitting ? "Connecting..." : "Agree and Continue with Google"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
