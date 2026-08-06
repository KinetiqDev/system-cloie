import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Manrope, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ToastProvider } from "@/components/ui/toast";

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
  return (
    <html
      lang="en"
      className={cn("h-full", manrope.variable, inter.variable, "font-sans")}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning className="flex min-h-full flex-col antialiased">
        {children}
        <Suspense fallback={null}>
          <ToastProvider />
        </Suspense>
      </body>
    </html>
  );
}
