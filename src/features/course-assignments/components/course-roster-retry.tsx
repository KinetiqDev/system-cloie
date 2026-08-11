"use client";

import { useTransition } from "react";
import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function CourseRosterRetry() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      aria-busy={isPending || undefined}
      onClick={() => startTransition(() => router.refresh())}
    >
      <RotateCw data-icon="inline-start" aria-hidden="true" />
      {isPending ? "Retrying" : "Try again"}
    </Button>
  );
}
