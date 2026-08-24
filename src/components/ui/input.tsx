import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "border-input bg-surface-input text-foreground file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring disabled:bg-muted aria-invalid:border-destructive aria-invalid:ring-destructive/20 h-8 w-full min-w-0 rounded-lg border px-2.5 py-1 text-base transition-[border-color,box-shadow,background-color] outline-none group-data-[disabled=true]/field:opacity-60 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:ring-3 motion-reduce:transition-none md:text-sm pointer-coarse:h-11",
        className
      )}
      {...props}
    />
  );
}

export { Input };
