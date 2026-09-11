import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const SYSTEM_TYPE_SCALE = [
  "display-lg",
  "display-md",
  "heading-xl",
  "heading-lg",
  "heading-md",
  "title-lg",
  "title-md",
  "title-sm",
  "body-lg",
  "body-md",
  "body-sm",
  "label-lg",
  "label-md",
  "label-sm",
  "caption",
];

// globals.css defines these text-* utilities as type-scale sizes. Without this,
// tailwind-merge reads them as text colors and drops them next to a real color.
const twMergeSystem = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: SYSTEM_TYPE_SCALE }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMergeSystem(clsx(inputs));
}
