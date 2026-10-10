"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Check, ChevronsUpDown } from "lucide-react";
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
import { isNextRedirectError } from "@/lib/utils/next-redirect";

/**
 * Topbar outline dropdown button for multi-role accounts. Renders nothing for single-role
 * sessions. Features a visible border, current role badge, and chevrons to clearly
 * signal an interactive switcher at rest. Selecting a role invokes the `switchActiveRole`
 * server action (which redirects to that role's dashboard) and refreshes the router.
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
            variant="outline"
            size="sm"
            aria-label={`Switch role. Current role: ${activeRole ? formatRole(activeRole) : "none"}`}
            title="Switch role"
            className="gap-1.5 shadow-2xs"
            disabled={isPending}
            loading={isPending}
          >
            <ArrowLeftRight className="text-muted-foreground size-3.5" aria-hidden="true" />
            <span className="max-w-28 truncate text-xs font-semibold sm:max-w-36 md:max-w-44">
              {activeRole ? formatRole(activeRole) : "Select role"}
            </span>
            <ChevronsUpDown className="text-muted-foreground size-3 shrink-0" aria-hidden="true" />
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
