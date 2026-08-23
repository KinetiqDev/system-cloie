import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Manrope, Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ToastProvider } from "@/components/ui/toast";
import { AppearanceBootstrapScript } from "@/features/design-system/components/appearance-bootstrap-script";
import { AppearanceProvider } from "@/features/design-system/components/appearance-provider";
import { resolveAppearanceAvailability } from "@/features/design-system/services/resolve-appearance-availability";

const manrope = Manrope({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "CLOIE — Assumption College of Davao",
    template: "%s | CLOIE",
  },
  description:
    "Comprehensive Learning Outcomes and Instructional Evaluation platform for Assumption College of Davao.",
  applicationName: "CLOIE",
  keywords: [
    "CLOIE",
    "Assumption College of Davao",
    "learning outcomes",
    "evaluation",
    "academic platform",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appearanceEnabled = resolveAppearanceAvailability();

  return (
    <html
      lang="en"
      className={cn("h-full", manrope.variable, inter.variable, "font-sans")}
      suppressHydrationWarning
    >
      <head>
        {appearanceEnabled ? <AppearanceBootstrapScript /> : null}
      </head>
      <body suppressHydrationWarning className="flex min-h-full flex-col antialiased">
        <AppearanceProvider enabled={appearanceEnabled}>{children}</AppearanceProvider>
        <Suspense fallback={null}>
          <ToastProvider />
        </Suspense>
        <SpeedInsights />
      </body>
    </html>
  );
}
