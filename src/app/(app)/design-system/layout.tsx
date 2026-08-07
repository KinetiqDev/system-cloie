import { notFound } from "next/navigation";
import { resolveShowcaseAccess } from "@/features/design-system/services/resolve-showcase-access";

/**
 * Server access boundary for the protected Design System Showcase
 * (ADR 0010, Design Decision 5).
 *
 * The check runs before any showcase content is yielded. Primary Production
 * and malformed demo configurations fail closed with the segment not-found
 * UI inside the authenticated `(app)` shell. The parent `(app)` layout
 * already applies the existing account-state guard and session resolution.
 */
export default function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  if (!resolveShowcaseAccess()) {
    notFound();
  }

  return children;
}
