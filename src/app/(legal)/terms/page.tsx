import type { Metadata } from "next";
import { LegalPageShell } from "@/features/legal/components/legal-page-shell";
import { termsOfUse } from "@/features/legal";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: termsOfUse.description,
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return <LegalPageShell document={termsOfUse} />;
}
