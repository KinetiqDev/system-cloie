"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Password field with a show/hide control, shared by every entry surface.
 *
 * A masked field with no way to check what was typed is a routine source of
 * typos in a long password, and it leaves a person with a screen reader or a
 * magnifier unable to confirm the field at all. The control is a real button
 * (keyboard reachable, 44px on touch) whose accessible name states the action
 * it performs, so it never depends on the icon alone.
 *
 * `ref` forwards to the input so react-hook-form can register it directly.
 */
export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<typeof Input> & { id: string }
>(function PasswordInput({ id, disabled, className, ...props }, ref) {
  const [visible, setVisible] = React.useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input
        {...props}
        id={id}
        ref={ref}
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={cn("pr-12", className)}
      />
      {/* inset-y-0 + my-auto centers without a translate, which the button's
          own press transform would otherwise overwrite. */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
        aria-controls={id}
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0.5 my-auto"
      >
        <Icon className="size-5" aria-hidden="true" />
      </Button>
    </div>
  );
});
