"use client";

import { useEffect } from "react";

/**
 * Scrolls the deep-linked outcome row into view once the outcomes view mounts
 * (§16.2). Rows carry `data-outcome-row` with their analytics outcome id;
 * matching by attribute value avoids selector-escaping snapshot keys such as
 * `snapshot:GO-9:Retired outcome`.
 */
export function SelectedOutcomeScrollTarget({ outcomeId }: { outcomeId?: string }) {
  useEffect(() => {
    if (!outcomeId) return;
    const row = [...document.querySelectorAll("[data-outcome-row]")].find(
      (element) => element.getAttribute("data-outcome-row") === outcomeId
    );
    row?.scrollIntoView?.({ block: "center" });
  }, [outcomeId]);
  return null;
}
