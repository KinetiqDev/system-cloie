import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { formatTermInstanceCompact } from "@/lib/utils/date-format";
import type { ActiveTermContext } from "../types";

interface ActiveTermBadgeProps {
  activeTerm: ActiveTermContext | null;
  className?: string;
}

/**
 * Displays the current active term as a compact badge.
 * Used in topbar, dashboards, and other header areas.
 */
export function ActiveTermBadge({ activeTerm, className }: ActiveTermBadgeProps) {
  if (!activeTerm) {
    return (
      <Badge variant="outline" className={className}>
        No active term
      </Badge>
    );
  }

  const label = formatTermInstanceCompact(
    activeTerm.schoolYear.code,
    activeTerm.termInstance.semester,
    activeTerm.termInstance.term
  );

  return (
    <Badge variant="success" className={className}>
      {label}
    </Badge>
  );
}

/**
 * Skeleton loader for the active term badge.
 */
export function ActiveTermBadgeSkeleton({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={className}>
      <Spinner size="sm" label="Loading active term" className="mr-1" />
      <span>Loading active term</span>
    </Badge>
  );
}
