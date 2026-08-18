"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast";

/** Chromium's beforeinstallprompt event; not part of the TS DOM lib. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppButton() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      // Suppress the browser's automatic install UI; prompt() is invoked from
      // the click handler to satisfy the user-gesture requirement.
      event.preventDefault();

      let standalone = false;
      try {
        standalone = window.matchMedia("(display-mode: standalone)").matches;
      } catch {
        // matchMedia unavailable (e.g. some test/embed environments): treat as
        // not standalone; eligibility still gates on beforeinstallprompt.
        standalone = false;
      }
      if (standalone) {
        return;
      }

      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setInstallEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (installEvent === null) {
    return null;
  }

  async function handleClick() {
    const event = installEvent;
    if (event === null) {
      return;
    }
    // Clear before prompting: prompt() works once per event, so a second click
    // must not reuse a stale event.
    setInstallEvent(null);

    try {
      await event.prompt();
      const { outcome } = await event.userChoice;
      if (outcome === "accepted") {
        showToast("System CLOIE installed", "success");
      }
    } catch {
      // prompt() can reject when the prompt is unavailable or already shown.
      // The button stays hidden for the visit rather than retrying.
    }
  }

  return (
    <Button variant="outline" onClick={handleClick} aria-label="Install System CLOIE app">
      <Download data-icon="inline-start" aria-hidden="true" />
      Install app
    </Button>
  );
}