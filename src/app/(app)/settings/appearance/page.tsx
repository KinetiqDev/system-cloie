import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppearanceSelector } from "@/features/design-system/components/appearance-selector";
import { resolveAppearanceAvailability } from "@/features/design-system/services/resolve-appearance-availability";

export default function AppearanceSettingsPage() {
  if (!resolveAppearanceAvailability()) {
    notFound();
  }

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in max-w-3xl space-y-8 motion-safe:duration-500">
      <div>
        <h1 className="font-heading text-text-primary text-2xl font-black">Appearance</h1>
        <p className="text-text-muted text-sm">
          Choose how CLOIE looks on this device. Your selection applies instantly.
        </p>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Theme</CardTitle>
          <CardDescription>
            Light, dark, or follow your operating system. This preference is stored in your
            browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <AppearanceSelector />
        </CardContent>
      </Card>
    </div>
  );
}
