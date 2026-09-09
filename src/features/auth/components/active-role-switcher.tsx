"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRole } from "@/features/users/lib/role-visuals";
import { switchActiveRole } from "@/lib/actions/switch-role-action";
import type { Role } from "@/lib/constants/roles";

/**
 * `redirect()` surfaces as a NEXT_REDIRECT digest when a server action is
 * awaited from the client. That means navigation is already in flight — it
 * is not a switch failure and must not be shown as an error.
 */
function isNextRedirectError(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

/**
 * Topbar dropdown for multi-role accounts. Renders nothing for single-role
 * sessions. Selecting a role invokes the `switchActiveRole` server action
 * (which redirects to that role's dashboard) and refreshes the router.
 */
export function ActiveRoleSwitcher({
  roles,
  activeRole,
}: {
  roles: Role[];
  activeRole: Role | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (roles.length <= 1) {
    return null;
  }

  const handleSelect = (role: Role) => {
    if (isPending || role === activeRole) {
      return;
    }
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          await switchActiveRole(role);
        } catch (switchError) {
          if (isNextRedirectError(switchError)) {
            return;
          }
          setError(switchError instanceof Error ? switchError.message : "Could not switch role.");
          return;
        }
        router.refresh();
      })();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Switch role. Current role: ${activeRole ? formatRole(activeRole) : "none"}`}
            className="hover:bg-sidebar-accent/40 hover:text-sidebar-foreground gap-1.5"
            disabled={isPending}
          >
            <ArrowLeftRight className="size-3.5" data-icon="inline-start" aria-hidden="true" />
            <span className="hidden max-w-32 truncate text-xs font-semibold md:inline">
              {activeRole ? formatRole(activeRole) : "Select role"}
            </span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={8} className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Switch role</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {roles.map((role) => (
          <DropdownMenuItem
            key={role}
            aria-current={role === activeRole ? "true" : undefined}
            className="gap-2"
            disabled={isPending}
            onClick={() => handleSelect(role)}
          >
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {formatRole(role)}
            </span>
            {role === activeRole ? (
              <Check className="text-primary size-4 shrink-0" aria-hidden="true" />
            ) : null}
          </DropdownMenuItem>
        ))}
        {error ? (
          <p role="alert" className="text-danger text-caption px-2 pt-1.5 pb-1">
            {error}
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
