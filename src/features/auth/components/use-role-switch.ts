"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RoleSwitcherUser } from "./role-switcher-list";

type UseRoleSwitchParams = {
  endpoint: string;
  requestKey: "email" | "identifier";
  users: readonly RoleSwitcherUser[];
  onSwitchSuccess?: () => void;
};

export function useRoleSwitch({
  endpoint,
  requestKey,
  users,
  onSwitchSuccess,
}: UseRoleSwitchParams) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const switchRole = async (user: RoleSwitcherUser) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [requestKey]: user.email }),
      });
      let data: { success?: boolean; destination?: string; error?: string };

      try {
        data = (await response.json()) as typeof data;
      } catch {
        setError("Role switch failed.");
        return;
      }

      if (!response.ok || !data.success) {
        setError(data.error ?? "Role switch failed.");
        return;
      }

      onSwitchSuccess?.();
      router.push(data.destination ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Role switch failed.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleRoleClick = (user: RoleSwitcherUser) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    startTransition(() => void switchRole(user));
  };

  const query = search.trim().toLowerCase();
  const filteredUsers = query
    ? users.filter(
        (user) =>
          user.label.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.role.replaceAll("_", " ").toLowerCase().includes(query)
      )
    : users;
  return {
    search,
    setSearch,
    error,
    isSubmitting,
    filteredUsers,
    handleRoleClick,
  };
}
