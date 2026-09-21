"use client";

import { useEffect } from "react";

/**
 * outcomes page mounts (§16.2). Rows carry `data-go-row` with their
 * analytics goId; matching by attribute value avoids selector-escaping
 * snapshot keys such as `snapshot:GO-9:Retired outcome`.
 */
export function SelectedGoScrollTarget({ goId }: { goId?: string }) {
  useEffect(() => {
    if (!goId) return;
    const row = [...document.querySelectorAll("[data-go-row]")].find(
      (element) => element.getAttribute("data-go-row") === goId
    );
    row?.scrollIntoView?.({ block: "center" });
  }, [goId]);
  return null;
}
