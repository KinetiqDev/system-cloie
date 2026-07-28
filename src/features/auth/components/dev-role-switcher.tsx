"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Search } from "lucide-react";
import { DEMO_USERS } from "@/lib/constants/demo-users";
import { cn } from "@/lib/utils";

type DevRoleSwitcherProps = {
  activeEmail?: string | null;
};

function useDraggable() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const dragStart = useRef<{
    pointerX: number;
    pointerY: number;
    elX: number;
    elY: number;
  } | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("cloie-dev-switcher-pos");
    if (!saved) return;
    queueMicrotask(() => {
      try {
        const parsed = JSON.parse(saved) as { x: number; y: number };
        setPosition(parsed);
      } catch {
        // ignore
      }
    });
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = container.getBoundingClientRect();
    dragStart.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      elX: rect.left,
      elY: rect.top,
    };
    isDragging.current = false;

    // Capture on the handle element itself, not the container
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;

    const dx = e.clientX - dragStart.current.pointerX;
    const dy = e.clientY - dragStart.current.pointerY;

    // Require a minimum movement to start dragging
    if (!isDragging.current && Math.abs(dx) + Math.abs(dy) < 5) return;
    isDragging.current = true;

    const newX = Math.max(0, Math.min(dragStart.current.elX + dx, window.innerWidth - 288));
    const newY = Math.max(0, Math.min(dragStart.current.elY + dy, window.innerHeight - 60));

    setPosition({ x: newX, y: newY });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

    if (isDragging.current && dragStart.current) {
      const dx = e.clientX - dragStart.current.pointerX;
      const dy = e.clientY - dragStart.current.pointerY;
      const newX = Math.max(0, Math.min(dragStart.current.elX + dx, window.innerWidth - 288));
      const newY = Math.max(0, Math.min(dragStart.current.elY + dy, window.innerHeight - 60));
      const pos = { x: newX, y: newY };
      setPosition(pos);
      window.localStorage.setItem("cloie-dev-switcher-pos", JSON.stringify(pos));
    }

    isDragging.current = false;
    dragStart.current = null;
  }, []);

  return {
    containerRef,
    position,
    isDragging,
    dragHandleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
  };
}

export function DevRoleSwitcher({ activeEmail }: DevRoleSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isExpanded, setIsExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { containerRef, position, isDragging, dragHandleProps } = useDraggable();

  const switchToDemoUser = async (email: string) => {
    setError(null);
    const response = await fetch("/api/auth/dev-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = (await response.json()) as {
      success: boolean;
      destination?: string;
      error?: string;
    };

    if (!response.ok || !data.success) {
      setError(data.error ?? "Demo login failed.");
      return;
    }

    router.push(data.destination ?? "/dashboard");
    router.refresh();
  };

  const isDemoMode = process.env.NODE_ENV === "development";

  useEffect(() => {
    if (!isDemoMode) return;
    const storedValue = window.localStorage.getItem("cloie-dev-role-switcher-expanded");

    if (storedValue === "true") {
      queueMicrotask(() => setIsExpanded(true));
    }
  }, [isDemoMode]);

  if (!isDemoMode) {
    return null;
  }

  const toggleExpanded = () => {
    if (isDragging.current) return;

    setIsExpanded((previous) => {
      const nextValue = !previous;

      window.localStorage.setItem("cloie-dev-role-switcher-expanded", String(nextValue));

      return nextValue;
    });
  };

  const style: React.CSSProperties = position
    ? { left: position.x, top: position.y, right: "auto", bottom: "auto" }
    : {};

  return (
    <div
      ref={containerRef}
      style={style}
      className={cn(
        "border-border bg-surface/95 z-[60] hidden w-72 rounded-2xl border p-3 shadow-xl backdrop-blur lg:block",
        position ? "fixed" : "fixed right-4 bottom-4"
      )}
    >
      {/* Header — always visible at the top */}
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className="text-text-muted hover:bg-surface-muted hover:text-text-secondary flex shrink-0 cursor-grab items-center rounded-md p-1 active:cursor-grabbing"
          title="Drag to reposition"
        >
          <GripVertical className="size-4" />
        </div>

        {/* Header button */}
        <button
          type="button"
          className="flex flex-1 items-start justify-between gap-3 text-left"
          onClick={toggleExpanded}
          aria-expanded={isExpanded}
          aria-controls="dev-role-switcher-panel"
        >
          <div>
            <p className="text-text-muted text-xs font-semibold tracking-[0.18em] uppercase">
              Dev Roles
            </p>
            <p className="text-text-secondary text-xs">
              {isExpanded ? "Instant sign-in for demo accounts" : "Click to expand sign-in options"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isPending && <span className="text-text-muted text-xs">...</span>}
            <span className="border-border bg-background text-text-secondary rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
              {isExpanded ? "Hide" : "Show"}
            </span>
          </div>
        </button>
      </div>

      {/* Expandable list — opens downward below the header */}
      <div
        id="dev-role-switcher-panel"
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows,margin-top,opacity] duration-200 ease-out",
          isExpanded ? "mt-3 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="min-h-0">
          <div className="grid max-h-[60vh] gap-1.5 overflow-y-auto pr-1">
            {error && (
              <p className="text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-1.5 text-[11px]">
                {error}
              </p>
            )}
            <div className="relative mb-1">
              <Search className="text-text-muted pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search roles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-border bg-background text-text-primary placeholder:text-text-muted w-full rounded-md border py-1.5 pl-6 pr-2 text-[11px] outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {DEMO_USERS.filter((u) => {
              const q = search.toLowerCase();
              return (
                u.label.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                u.role.toLowerCase().includes(q)
              );
            }).map((user) => {
              const isActive = user.email === activeEmail;

              return (
                <button
                  key={user.email}
                  type="button"
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-left transition-colors",
                    isActive
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-background hover:border-primary/40 hover:bg-primary-soft/40"
                  )}
                  onClick={() => startTransition(() => switchToDemoUser(user.email))}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{user.label}</p>
                      <p className="text-text-muted truncate text-[10px]">{user.email}</p>
                    </div>
                    <span className="bg-surface-muted text-text-secondary shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase">
                      {user.role.replaceAll("_", " ")}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
