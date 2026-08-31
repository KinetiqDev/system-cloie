import * as React from "react";

import { cn } from "@/lib/utils";

type SpinnerSize = "sm" | "default" | "lg";

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "size-3",
  default: "size-4",
  lg: "size-5",
};

/**
 * Spinner — shared loading indicator.
 *
 * Base UI-compatible: plain SVG, no Radix dependency.
 * Composes with the Button loading affordance; also usable standalone.
 * Always exposes loading state text for screen readers via aria-label.
 */
function Spinner({
  size = "default",
  className,
  label = "Loading",
  ...props
}: {
  size?: SpinnerSize;
  className?: string;
  label?: string;
} & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      role="status"
      aria-label={label}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      className={cn("animate-spin motion-reduce:animate-none", sizeClasses[size], className)}
      {...props}
    >
      {/* Full circle track */}
      <circle cx={12} cy={12} r={10} className="opacity-20 motion-reduce:animate-pulse" />
      {/* Active arc — quarter circle */}
      <path d="M12 2a10 10 0 0 1 10 10" className="opacity-80 motion-reduce:animate-pulse" />
    </svg>
  );
}

export { Spinner };
// fallow-ignore-next-line unused-type
export type { SpinnerSize };
