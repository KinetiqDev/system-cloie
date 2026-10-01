import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The System CLOIE product mark on its brand-safe plate: a white circle with a
 * hairline border, never a rectangular frame. The circle keeps the navy artwork
 * legible on dark surfaces and anchors the brand as a coin in every theme.
 * Size it from the outside (`className="h-9"`, `size-16 sm:size-18`); the
 * artwork keeps the mark's native 442 × 500 aspect centered in the plate.
 */
export function CloieLogoMark({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={cn(
        "border-border flex aspect-square shrink-0 items-center justify-center rounded-full border bg-white shadow-sm",
        className
      )}
    >
      <Image
        src="/logos/cloie-logo.svg"
        alt="System CLOIE"
        width={442}
        height={500}
        className="h-[78%] w-auto"
        priority={priority}
      />
    </span>
  );
}
