import type { Metadata } from "next";
import { LegalPageShell } from "@/features/legal/components/legal-page-shell";
import { privacyNotice } from "@/features/legal";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description: privacyNotice.description,
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return <LegalPageShell document={privacyNotice} />;
}
