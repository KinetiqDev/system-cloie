"use client";

import { useEffect } from "react";

/**
 * Scrolls the deep-linked PLO row into view after the server-rendered
 * outcomes page mounts (§16.2). Rows carry `data-plo-row` with their
 * analytics ploId; matching by attribute value avoids selector-escaping
 * snapshot keys such as `snapshot:PLO-9:Retired outcome`.
 */
export function SelectedPloScrollTarget({ ploId }: { ploId?: string }) {
  useEffect(() => {
    if (!ploId) return;
    const row = [...document.querySelectorAll("[data-plo-row]")].find(
      (element) => element.getAttribute("data-plo-row") === ploId
    );
    row?.scrollIntoView?.({ block: "center" });
  }, [ploId]);
  return null;
}
