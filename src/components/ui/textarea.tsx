import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input bg-surface-input text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring disabled:bg-muted aria-invalid:border-destructive aria-invalid:ring-destructive/20 flex field-sizing-content min-h-16 w-full rounded-lg border px-2.5 py-2 text-base transition-[border-color,box-shadow,background-color] outline-none group-data-[disabled=true]/field:opacity-60 focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:ring-3 motion-reduce:transition-none md:text-sm pointer-coarse:min-h-11",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
